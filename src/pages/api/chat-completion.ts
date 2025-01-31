import { ChatRole } from '@/components/ChatGPT/interface';
import { Message } from '@/models'
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser'
const axios = require('axios');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''; // Get API key from environment variables

const validateAddress = async (address: string) => {
  const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: { addressLines: [address] } }),
    });
    const data = await response.json();
    // console.log(data)

    if (data.result.verdict.validationGranularity != 'PREMISE' && data.result.verdict.validationGranularity != 'SUBPREMISE') {
      // console.log('Address does not seem to exist.');
      return ("Does not exist")
    }
    else if (data.result.verdict.hasUnconfirmedComponents || data.result.verdict.hasInferredComponents) {
      // console.log('Address has unconfirmed or inferred components.');
      return (data.result.address.formattedAddress)
    }
    else if(data.result.verdict.addressComplete){
      // console.log('Address is complete.');
      return ("Valid")
    }


  } catch (error) {
    console.error('Error fetching data from Address Validation API:', error);
    return "Error";
  }
};


const findDoctor = async (doctor_details: string) => {
  let google_search_input = JSON.stringify({
      "q": "Doctor " + doctor_details,
      // "as_epq": "address"
  });

  let google_search_config = {
      method: 'post',
      url: 'https://google.serper.dev/search',
      headers: { 
          'X-API-KEY': '09b8b1cf455edf2472c1b1dae4b8f050f92e1c91', 
          'Content-Type': 'application/json'
      },
      data: google_search_input
  };

  try {
      let response_google = await axios(google_search_config); // Get the Google Search results
      return response_google.data.organic[0].link
  } catch (error) {
      console.log("Error");
      console.error(error);
  }
}

export const config = {
  runtime: 'edge'
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const { messages } = (await req.json()) as {
      messages: Message[]
    }

    const charLimit = 12000
    let charCount = 0
    let messagesToSend = []

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      if (charCount + message.content.length > charLimit) {
        break
      }
      charCount += message.content.length
      messagesToSend.push(message)
    }

    const useAzureOpenAI =
      process.env.AZURE_OPENAI_API_BASE_URL && process.env.AZURE_OPENAI_API_BASE_URL.length > 0

    let apiUrl: string
    let apiKey: string
    let model: string
    if (useAzureOpenAI) {
      let apiBaseUrl = process.env.AZURE_OPENAI_API_BASE_URL
      const version = '2024-02-01'
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || ''
      if (apiBaseUrl && apiBaseUrl.endsWith('/')) {
        apiBaseUrl = apiBaseUrl.slice(0, -1)
      }
      apiUrl = `${apiBaseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${version}`
      apiKey = process.env.AZURE_OPENAI_API_KEY || ''
      model = '' // Azure Open AI always ignores the model and decides based on the deployment name passed through.
    } else {
      let apiBaseUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com'
      if (apiBaseUrl && apiBaseUrl.endsWith('/')) {
        apiBaseUrl = apiBaseUrl.slice(0, -1)
      }
      apiUrl = `${apiBaseUrl}/v1/chat/completions`
      apiKey = process.env.OPENAI_API_KEY || ''
      model = 'gpt-4o-2024-08-06' // todo: allow this to be passed through from client and support gpt-4
    }
    // console.log(messagesToSend)
    const stream = await OpenAIStream(apiUrl, apiKey, model, messagesToSend)

    return new Response(stream)
  } catch (error) {
    console.error(error)
    return new Response('Error', { status: 500 })
  }
}

const OpenAIStream = async (apiUrl: string, apiKey: string, model: string, messages: Message[]) => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const tools = [
    {
        "type": "function",
        "function": {
            "name": "validate_address",
            "description": "Validate the address of the patient. Return a string with a valid address if the one that was submitted is not valid, or 'Valid' if the one that was submitted is valid.",
            "parameters": {
                "type": "object",
                "properties": {
                    "address": {
                        "type": "string",
                        "description": "The address of the patient",
                    },
                },
                "required": ["address"],
            },
        }
    },
    {
      "type": "function",
      "function": {
          "name": "find_doctor",
          "description": "Search google to find the website of the patient's family doctor. Return the results of the search.",
          "parameters": {
              "type": "object",
              "properties": {
                  "doctor_details": {
                      "type": "string",
                      "description": "Name of the doctor, and potentially other details such as location of practice",
                  },
              },
              "required": ["doctor_details"],
          },
      }
    }
  ]

  const createRequest = (apiKey: string, model: string, messages: Message[]) => {
    return {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'api-key': `${apiKey}`
      },
      method: 'POST',
      body: JSON.stringify({
        model: model,
        tools: tools,
        frequency_penalty: 0,
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: `Help me collect data from a patient, by chatting with them. 
            First confirm the patient's name and email address (which you already know).
            Then acquire further information about the patient in the following order:
              - Age
              - Sex
              - Medical conditions
              - Medications
              - Address. We need their full address, including street, city, state, country and postal code or zip code. 
                Use the validate_address tool to validate the address. 
                If the tool returns "Valid", then the address is valid and you can move on.
                If the tool returns an address, it means that the address submitted was not valid - in this case ask the user to confirm that the returned address is indeed their correct address. If they confirm then move on, if they don't confirm and say that there are issues, ask them to explain what is wrong then resubmit the new address for verification.
                If the tool returns "Does not exist", then the address does not exist - in this case ask the user to enter an address that does exist.
              - Name of their family doctor. Once you have some informationa bout their family doctor, use the find_doctor tool to find the website of the doctor, then ask the patient to confirm that the website belongs to their doctor (give them the URL). If they say it doesn't then ask for more details of the doctor and search again, until you find a website that belongs to their doctor.
            Ask for these one at a time, and get clarifications where necessary.
            Once you have all of the information thank the patient for their time and then create a 
            summary containing all the information they have given you (name, email, age, sex, medical conditions, medications, address, family doctor name and website). `
          },
                        // - Name of their family doctor. Once you have some informationa bout their family doctor, use the find_doctor tool to find the website of the doctor, then ask the patient which of the websites belongs to their doctor (give the patient the URLs one at a time until they confirm that one of them is their doctor's website)
          ...messages
        ],
        presence_penalty: 0,
        stream: true,
        temperature: 0.01
      })
    }
  }

  let req = createRequest(apiKey, model, messages);


  let res = await fetch(apiUrl, req)

  if (res.status !== 200) {
    const statusText = res.statusText
    console.log(res)
    throw new Error(
      `The OpenAI API has encountered an error with a status code of ${res.status} and message ${statusText}`
    )
  }

  return new ReadableStream({
    async start(controller) {
 
      async function processChunks(resBody: ReadableStream<Uint8Array>) {
        const reader = resBody.getReader();
        let functionName = ''
        let functionArguments = ''
        let toolCallId = ''
        let isCollectingFunctionArgs = false
        let toolCallMessage = ''

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("done!")
              if (isCollectingFunctionArgs) {
                // Add the tool request to messages array and send to client with internal flag
                let toolRequest = {
                  role: ChatRole.Assistant,
                  content: toolCallMessage,
                  tool_calls: [{
                    id: toolCallId,
                    type: "function",
                    function: {
                      name: functionName,
                      arguments: functionArguments
                    }
                  }],
                  isInternal: true
                }
                messages.push(toolRequest);
                controller.enqueue(encoder.encode(JSON.stringify({ ...toolRequest, type: 'tool_request' })));

                // Add the function response to messages array and send to client with internal flag
                let functionResult;
                if (functionName === "validate_address") {
                  functionResult = await validateAddress(JSON.parse(functionArguments)['address']);
                } else if (functionName === "find_doctor") {
                  functionResult = await findDoctor(JSON.parse(functionArguments)['doctor_details']);
                }

                let toolResponse = {
                  role: ChatRole.Tool,
                  tool_call_id: toolCallId,
                  name: functionName,
                  content: functionResult,
                  isInternal: true
                }

                messages.push(toolResponse);
                controller.enqueue(encoder.encode(JSON.stringify({ ...toolResponse, type: 'tool_response' })));

                // Make a new request to get the assistant's final response
                let req = createRequest(apiKey, model, messages);
                let res = await fetch(apiUrl, req);
                await processChunks(res.body as any);
              }
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              // Skip empty lines and [DONE] messages
              if (!line || line === 'data: [DONE]') {
                continue;
              }

              // console.log(line)
              // Remove 'data: ' prefix if it exists
              const jsonString = line.replace(/^data: /, '').trim();
              
              try {
                // Parse the JSON string
                const json = JSON.parse(jsonString);
                const delta = json.choices[0].delta;
                console.log(delta)
                
                if (delta.content) {
                  const queue = encoder.encode(delta.content);
                  controller.enqueue(queue);
                  if (isCollectingFunctionArgs) {
                    toolCallMessage += delta.content;
                  }
                }
                
                // Handle tool calls if needed
                if (delta.tool_calls) {
                  console.log('Tool call detected:', delta.tool_calls);
                  isCollectingFunctionArgs = true;
                  let toolCall = delta.tool_calls[0]
                  // console.log(toolCall)
                  if (toolCall.function?.name) {
                    functionName = toolCall.function.name
                    // console.log(`Function name: ${functionName}`)
                  }
                  if (toolCall.id) {
                    toolCallId = toolCall.id
                    // console.log(`Tool call id: ${toolCallId}`)
                  }
                  if (toolCall.function?.arguments) {
                    functionArguments += toolCall.function.arguments
                    // console.log(`Arguments: ${functionArguments}`)
                  }
                }
              } catch (e) {
                console.log(e)
                console.log(line)
                continue;
              }
            }
            

          }
        } finally {
          reader.releaseLock();
        }
      }

      // await processChunks(res.body as any, parser);
      await processChunks(res.body as any);
      controller.close();
    }
  })
}
export default handler

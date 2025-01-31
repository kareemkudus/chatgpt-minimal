const axios = require('axios');
// const cheerio = require('cheerio');



const processTargets = async () => {
    let google_search_input = JSON.stringify({
        "q": "doctor prisila santhakumar",
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
        console.log(response_google.data.organic[0].link)
    } catch (error) {
        console.log("Error");
        console.error(error);
    }


    
    
    
    // const queries = []; // Array to store all queries


    // // const maxRows = 1;
    // try {
    //     let response = await differential.find({});
    //     console.log(response.length);


    //     // const response = await new Promise((resolve, reject) => {
    //     //     let output = [];
    //     //     fs.createReadStream('conditions.csv')
    //     //         .pipe(csv())
    //     //         .on('data', (row) => {
    //     //             if (output.length < maxRows) {
    //     //                 output.push(row[Object.keys(row)[0]]); // Push the first column of the row
    //     //             }
    //     //         })
    //     //         .on('end', () => {
    //     //             resolve(output);
    //     //         })
    //     //         .on('error', (err) => {
    //     //             reject(err);
    //     //         });
    //     // });
    //     // console.log(response)

    //     outerLoop: for (let i = 0; i < response.length; i++) {
    //         let diagnosis = response[i].name;
    //         console.log(i);
    //         if (response[i].consultTips){
    //             console.log(diagnosis + " does have consultTips...Skipping")
    //         }
    //         else{
    //             console.log(diagnosis + " does not have consultTips...Generating")
    //             // console.log(response[i])
                
    //             let google_search_input = JSON.stringify({
    //                 "q": diagnosis + "(site:my.clevelandclinic.org OR site:patient.info OR site:fpnotebook.com OR site:medlineplus.gov OR site:mayoclinic.org)"
    //             });

    //             let google_search_config = {
    //                 method: 'post',
    //                 url: 'https://google.serper.dev/search',
    //                 headers: { 
    //                     'X-API-KEY': '09b8b1cf455edf2472c1b1dae4b8f050f92e1c91', 
    //                     'Content-Type': 'application/json'
    //                 },
    //                 data: google_search_input
    //             };

    //             try {
    //                 let response_google = await axios(google_search_config); // Get the Google Search results
    //                 let organicResults = response_google.data["organic"];
    //                 if (!organicResults || organicResults.length === 0) {
    //                     console.log(`No results found for ${diagnosis}, skipping...`);
    //                     continue outerLoop; // Skip this diagnosis
    //                 }
    //                 let sources = [];
    //                 for (let j = 0; j < 9; j++) {
    //                     try {
    //                         let link = response_google.data["organic"][j]["link"];
    //                         let response_website = await axios.get(link);
    //                         let html = response_website.data;
    //                         let $ = cheerio.load(html);
    //                         $('script, style, noscript').remove();
    //                         const allText = $('body').text();
    //                         const cleanText = allText.replace(/\s\s+/g, ' ').trim();

    //                         let source = {
    //                             link: link,
    //                             clean_text: cleanText
    //                         };

    //                         sources.push(source);
    //                     } catch (error) {
    //                         console.error(`Error processing link ${j}: ${error.message}`);
    //                         console.log(`The link causing trouble: ${response_google.data["organic"][j]}`)
    //                         if (j>5){
    //                             console.error(`Still have ${j}: sources, will continue on`);
    //                             break;
    //                         }
    //                         else{
    //                             console.error(`Only have ${j}: sources, which is not enough, skipping ${diagnosis} `);
    //                             continue outerLoop; // Skip this diagnosis
    //                         }
    //                     }
    //                 }

    //                 let query = {
    //                     "custom_id":diagnosis,
    //                     "method": 'POST',
    //                     "url": "/v1/chat/completions",
    //                     "body": {
    //                         "model": "gpt-4o-2024-05-13",
    //                         "temperature": 0.0,
    //                         "response_format": { "type": "json_object" },
    //                         "messages": [
    //                             { "role": "system", "content": "You are a helpful assistant with expertise in medicine." },
    //                             {
    //                                 "role": "user", "content":
    //                                     `I will give you a diagnosis that I am considering for my patient. I will also provide you with some information from a reliable webpages that you can use to help provide me with accurate information, if the information is helpful for you.
    //                                     You will respond with a json string that will help me confirm or rule-out my proposed diagnosis.
                                        
    //                                     The json string will contain five different javascript objects:
    //                                     The first object will be named 'Typical Patient Characteristics', and will contain a list of three typical characteristics of patients with this diagnosis (age, symptoms, physical characteristics, other medical issues, taking certain medications, etc). 
    //                                     The second object will be named 'Physical Examination' and will contain a list of physical exams I could perform to confirm the diagnosis. 
    //                                     The third object will be named 'Diagnostic Tests' and will contain a list of two diagnostic tests I could perform to confirm the diagnosis.
    //                                     The fourth object will be named 'Management' and will contain a list of ways I should manage the condition, including lifestyle advice and medications to consider. If medication is advised, include how the medication should be started and titrated as well as specific treatment targets.
    //                                     The fifth object will be named 'Red Flags' and will contain a list of symptoms/signs I should look for to identify an immediate, life threatening pathology.
    //                                     Within each object, information should be presented in distinct points; break things down into separate unrelated items where possible.
                                        
    //                                     Each element in these lists will contain three key-value pairs.              
    //                                     -The first key, “info”, will contain the information that I have requested from you. 
    //                                     -The second key, “source”, will contain the identical text from the reliable source that you used to create the corresponding “info” value within the same javascript object. If you did not use any information from the reliable source to create the "info" then the "source" value should be set to "None". The content of "source" should always be verbatim from the reliable source; do not combine pieces of text from different parts of the reliable source.
    //                                     -The third key, "link" will contain "None" if the corresponding "source" value is none. Otherwise, it will contain a URL that links to the specific text on the webpage where the information in "source" can be found using text fragmenting. `
    //                             },
    //                             { "role": "assistant", "content": "Understood. Please provide your proposed diagnosis, and the information from the reliable sources." },
    //                             { "role": "user", "content": "Proposed diagnosis: " + diagnosis + ". Here is the information from the reliable sources: " + JSON.stringify(sources) },
    //                         ]
    //                     }
    //                 };

    //                 queries.push(query); // Save the query to the array
    //                 // console.log(queries)
    //                 let jsonlData = queries.map(q => JSON.stringify(q)).join('\n');
    //                 fs.writeFileSync('queries.jsonl', jsonlData, 'utf8');


    //             } catch (error) {
    //                 console.log("Error");
    //                 console.error(error);
    //             }
    //         }




    //     }

    // } catch (error) {
    //     console.log("Error");
    //     console.error(error);
    // }
};


processTargets()

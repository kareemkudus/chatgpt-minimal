import fetch from 'node-fetch';

const API_KEY = 'AIzaSyD0lcpuf5FgnLviI0l_2V1TIqFyCKKqElE'; // Replace with your Address Validation API key

const validateAddress = async (address) => {
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
    console.log(data)
    // console.log(data.geoCode.location)


    if (data.result.verdict.validationGranularity != 'PREMISE' && data.result.verdict.validationGranularity != 'SUBPREMISE') {
      console.log('Address does not seem to exist.');
      return ("Does not exist")
    }
    else if (data.result.verdict.hasUnconfirmedComponents || data.result.verdict.hasInferredComponents) {
      console.log('Address has unconfirmed or inferred components.');
      return (data.result.address.formattedAddress)
    }
    else if(data.result.verdict.addressComplete){
      console.log('Address is complete.');
      return ("Valid")
    }

  } catch (error) {
    console.error('Error fetching data from Address Validation API:', error);
    return "Error";
  }
};

// Example usage
// const addressToValidate = '123 Sesame St, Beverly Hills, CA 90210, USA';
const addressToValidate = '161 twelfth street, toronto, unit 1';
let result = await validateAddress(addressToValidate);
console.log(result);
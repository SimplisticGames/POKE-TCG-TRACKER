// In netlify/functions/analyze.js

const fetch = require('node-fetch');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // The function now expects a name and a full number string (e.g., "130/203")
    const { cardName, numberString } = JSON.parse(event.body);

    if (!cardName || !numberString || !numberString.includes('/')) {
      throw new Error("A valid card name and number (e.g., 130/203) are required.");
    }

    // --- Data Cleaning Logic ---
    const numberParts = numberString.split('/');
    const collectorNumberPart = parseInt(numberParts[0], 10);
    const setTotalPart = parseInt(numberParts[1], 10);

    if (isNaN(collectorNumberPart) || isNaN(setTotalPart)) {
      throw new Error(`Invalid number format received: ${numberString}`);
    }

    // --- Query the TCG API ---
    const tcgApiUrl = `https://api.pokemontcg.io/v2/cards?q=name:"${cardName}" number:${collectorNumberPart}`;
    const tcgResponse = await fetch(tcgApiUrl);
    if (!tcgResponse.ok) { throw new Error("Failed to query the Pokémon TCG API."); }
    const tcgData = await tcgResponse.json();

    if (!tcgData.data || tcgData.data.length === 0) {
      throw new Error(`No cards found for ${cardName} #${collectorNumberPart}.`);
    }

    // --- Find the correct card using the set total as a tie-breaker ---
    const correctCard = tcgData.data.find(card => card.set.printedTotal === setTotalPart);

    if (!correctCard) {
      throw new Error(`Found cards for ${cardName} #${collectorNumberPart}, but none matched the set total of ${setTotalPart}.`);
    }
    
    // --- Build and return the final data ---
    const finalCardInfo = {
      name: correctCard.name,
      set: correctCard.set.name,
      number: correctCard.number + '/' + correctCard.set.printedTotal,
      rarity: correctCard.rarity || "N/A",
      notes: `Illustrator: ${correctCard.artist}`
    };

    return {
      statusCode: 200,
      body: JSON.stringify(finalCardInfo)
    };

  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
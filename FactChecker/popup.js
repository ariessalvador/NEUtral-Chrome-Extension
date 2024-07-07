require('dotenv').config();

document.addEventListener('DOMContentLoaded', () => {
    const statementInput = document.getElementById('statement');
    const checkButton = document.getElementById('checkButton');
    const resultDiv = document.getElementById('result');
    const currentDateTimeDiv = document.getElementById('currentDateTime');

    // Display current date and time (Philippine time)
    const updateDateTime = () => {
        const now = new Date();
        const options = { 
            timeZone: 'Asia/Manila',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        };
        const dateTimeString = new Intl.DateTimeFormat('en-US', options).format(now);
        currentDateTimeDiv.textContent = dateTimeString;
    };
    updateDateTime();
    setInterval(updateDateTime, 1000);

    checkButton.addEventListener('click', async () => {
        const statement = statementInput.value;
        if (statement) {
            const question = await convertStatementToQuestion(statement);
            const googleResult = await search(question);
            if (googleResult) {
                const assistantResponse = await validateStatement(googleResult, statement);
                resultDiv.innerHTML = `
                    <p>${assistantResponse}</p>
                    <p>Source Link: <a href="${googleResult.link}" target="_blank">${googleResult.title}</a></p>
                    <img src="https://www.google.com/s2/favicons?domain=${new URL(googleResult.link).hostname}" alt="Source Thumbnail">
                `;
            } else {
                resultDiv.textContent = 'No results found.';
            }
        }
    });
});

async function convertStatementToQuestion(statement) {
    const prePrompt = "Statement: '" + statement + "' Make a search prompt to verify the statement. Be specific and make the search a question. Make it simple. Only start the question with 5 Ws (Who, What, When, Where & Why). IF the statement is about a certain person, add 'wikipedia' on the end of the question Example: Statement: Bong bong Marcos is the current president of the Philippines Answer = Who is the current president of the Philippines?";
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: prePrompt },
                    { role: 'user', content: statement }
                ],
                temperature: 0.7
            })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function search(query) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const topResult = data.items[0];
            return {
                title: topResult.title,
                link: topResult.link,
                snippet: topResult.snippet
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function validateStatement(googleResult, statement) {
    const prePrompt = `Pattern for your answer:
        <h3>Feedback: The statement '__' is true/false.</h3>
        <p> '_' (Explain here briefly)</p>
        
        Guide: 
        Statement: Bong bong marcos is the current president of the philippines 
        Search Result Snippet: The current president of the Philippines is Bongbong Marcos, who was sworn in on June 30, 2022. 
        Search Result Title: President of the Philippines - Wikipedia 

        Answer: 
        Feedback: The statement 'Bong bong marcos is the current president of the philippines' is true. Bongbong Marcos began his presidency on June 30, 2022, succeeding Rodrigo Duterte. 
        Source: President of the Philippines - Wikipedia 
        Source Link: https://en.wikipedia.org/wiki/President_of_the_Philippines

        Statement: "${statement}"

        Search Result Snippet: ${googleResult.snippet}
        Search Result Title: ${googleResult.title}

        Task: Compare the information presented in the search result snippet with the statement. Follow the guide above; it should consist of 'Feedback', and 'Source'. Only base your answer from the given snippet`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: prePrompt }
                ],
                temperature: 0.7
            })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error:', error);
    }
}

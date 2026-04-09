const fs = require('fs');
let content = fs.readFileSync('src/data/wiki-data.json', 'utf8');

// Fix values missing closing quote
// We look for ":" followed by some text, and then either a comma or a closing brace.
// We assume the text does not contain quotes.
content = content.replace(/":\s*"([^"]+)(?=[,}])/g, '":"$1"');

// Fix keys missing closing quote
// We look for ," followed by some text, and then a colon.
content = content.replace(/,\s*"([^"]+)(?=:)/g, ',"$1"');

fs.writeFileSync('src/data/wiki-data.json', content, 'utf8');

try {
    JSON.parse(content);
    console.log("JSON is now VALID");
} catch (e) {
    console.log("JSON is STILL invalid: " + e.message);
    // Let's show the context again if it's still invalid
    const posMatch = e.message.match(/position (\d+)/);
    if (posMatch) {
        const p = parseInt(posMatch[1]);
        console.log('Context at ' + p + ': ' + content.substring(p-20, p+20));
    }
}

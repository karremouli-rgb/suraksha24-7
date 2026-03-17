const fs = require('fs');

try {
  const htmlSource = fs.readFileSync('suraksha-frontend - Copy.html', 'utf8');

  // Extract CSS
  const cssMatch = htmlSource.match(/<style>([\s\S]*?)<\/style>/);
  if(cssMatch) {
    fs.mkdirSync('suraksha-frontend/css', { recursive: true });
    fs.writeFileSync('suraksha-frontend/css/style.css', cssMatch[1].trim(), 'utf8');
  } else {
    console.log("No <style> found");
  }

  // Replace script and style tags
  let newHtml = htmlSource.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="css/style.css">');
  newHtml = newHtml.replace(/<script>[\s\S]*?<\/script>/, '<script src="js/app.js"></script>');

  fs.mkdirSync('suraksha-frontend/js', { recursive: true });
  fs.writeFileSync('suraksha-frontend/index.html', newHtml, 'utf8');

  console.log('Extraction complete!');
} catch (e) {
  console.error("Extraction error:", e);
}

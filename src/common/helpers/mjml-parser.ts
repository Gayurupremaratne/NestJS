import mjml from 'mjml';
import * as fs from 'fs';
import * as path from 'path';

const mjmlFolder = path.join(__dirname, '../../modules/mail/mjml-templates');
const makeFolder = path.join(__dirname, '../../modules/mail/templates');

// Check if the folder exists
if (fs.existsSync(makeFolder)) {
  // Delete the folder and its contents
  fs.rmSync(makeFolder, { recursive: true });
  fs.mkdirSync(makeFolder, { recursive: true });
} else {
  // Create the folder
  fs.mkdirSync(makeFolder, { recursive: true });
}
fs.readdir(mjmlFolder, (err, files) => {
  if (err) {
    return console.error(err);
  }
  let hbs: string;
  let fileContent: string;
  files.forEach((file) => {
    console.warn('Template: ' + file);
    fileContent = fs.readFileSync(
      path.join(__dirname, '../../modules/mail/mjml-templates', file),
      'utf-8',
    );
    const mjmlResult = mjml(fileContent);
    hbs = path.join(__dirname, `../../modules/mail/templates/${file.replace('.mjml', '.hbs')}`);
    fs.writeFileSync(hbs, mjmlResult.html);
  });
});

// Script para generar hash de contraseña usando bcrypt
const bcrypt = require('bcrypt');

const password = 'Test123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log(hash);
});

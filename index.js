const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;

const app = express();
app.use(express.json());
app.use(cors());

// Lista de dominios temporales/desechables más comunes
const disposableDomains = [
  'tempmail.com', 'mailinator.com', '10minutemail.com', 'guerrillamail.com',
  'trashmail.com', 'sharklasers.com', 'getnada.com', 'throwawaymail.com',
  'yopmail.com', 'dispostable.com', 'fakemailgenerator.com'
];

// Dominios de correo personal gratuitos comunes
const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'live.com', 'aol.com'];

app.post('/validate', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ valid: false, reason: 'Se requiere el parámetro "email".' });
  }

  // 1. Validación de sintaxis básica por Regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.json({ valid: false, reason: 'Formato de correo electrónico inválido.' });
  }

  const [localPart, domain] = email.toLowerCase().split('@');

  // 2. Comprobar si es un correo temporal / desechable
  const isDisposable = disposableDomains.includes(domain);
  if (isDisposable) {
    return res.json({
      valid: false,
      reason: 'El correo pertenece a un proveedor temporal o desechable (Disposable).',
      details: { domain, is_disposable: true }
    });
  }

  // 3. Comprobar si es personal o corporativo
  const isFreeProvider = freeProviders.includes(domain);
  const accountType = isFreeProvider ? 'PERSONAL' : 'CORPORATE';

  // 4. Verificar registros MX en el DNS del dominio
  let hasMxRecords = false;
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      hasMxRecords = true;
    }
  } catch (error) {
    hasMxRecords = false;
  }

  if (!hasMxRecords) {
    return res.json({
      valid: false,
      reason: 'El dominio no tiene servidores de correo configurados (registros MX no encontrados).',
      details: { domain, has_mx: false }
    });
  }

  // Respuesta exitosa (Correo válido, corporativo/personal, con MX activo)
  return res.json({
    valid: true,
    email: email,
    details: {
      domain: domain,
      account_type: accountType, // Devuelve "CORPORATE" o "PERSONAL"
      is_disposable: false,
      has_mx_records: true
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`B2B Email Verifier corriendo en puerto ${PORT}`);
});

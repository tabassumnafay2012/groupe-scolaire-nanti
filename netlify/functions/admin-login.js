const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée." })
    };
  }

  try {
    const { password } = JSON.parse(event.body || "{}");
    const expected = process.env.GSN_ADMIN_PASSWORD;
    const secret = process.env.GSN_TOKEN_SECRET;

    if (!expected || !secret) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Configuration administrateur incomplète."
        })
      };
    }

    if (typeof password !== "string" || password !== expected) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Mot de passe incorrect."
        })
      };
    }

    const payload = Buffer.from(
      JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })
    ).toString("base64url");

    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: `${payload}.${signature}` })
    };
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Requête invalide." })
    }; 
  }   
};  

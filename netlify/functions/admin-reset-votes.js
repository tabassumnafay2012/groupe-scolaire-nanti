const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée." })
    };
  }

  try {
    const secret = process.env.GSN_TOKEN_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret || !supabaseUrl || !supabaseKey) {
      throw new Error("Configuration serveur manquante.");
    }

    const token =
      event.headers["x-admin-token"] ||
      event.headers["X-Admin-Token"] ||
      "";

    const parts = token.split(".");

    if (parts.length !== 2) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Connexion administrateur requise." })
      };
    }

    const [payload, signature] = parts;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const suppliedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Jeton administrateur invalide." })
      };
    }

    let decoded;

    try {
      decoded = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8")
      );
    } catch {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Jeton administrateur invalide." })
      };
    }

    if (!decoded.exp || decoded.exp < Date.now()) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Session expirée. Reconnecte-toi." })
      };
    }

    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/votes?candidate_id=not.is.null`,
      {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal"
        }
      }
    );

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Impossible de réinitialiser les votes."
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Les votes ont été réinitialisés."
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erreur du serveur lors de la réinitialisation."
      })
    };
  }
};

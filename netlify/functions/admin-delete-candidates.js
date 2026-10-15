const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Méthode non autorisée."
      })
    };
  }

  try {
    const secret = process.env.GSN_TOKEN_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret || !supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Configuration du serveur incomplète."
        })
      };
    }

    const token =
      event.headers["x-admin-token"] ||
      event.headers["X-Admin-Token"] ||
      "";

    const parts = token.split(".");

    if (parts.length !== 2) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: "Connexion administrateur requise."
        })
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
        headers,
        body: JSON.stringify({
          error: "Jeton administrateur invalide."
        })
      };
    }

    let session;

    try {
      session = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8")
      );
    } catch {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: "Jeton administrateur invalide."
        })
      };
    }

    if (
      !session.exp ||
      !Number.isFinite(session.exp) ||
      session.exp < Date.now()
    ) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: "Session expirée. Reconnecte-toi."
        })
      };
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    // Supprimer d'abord les votes associés aux candidats.
    const { error: votesError } = await supabase
      .from("votes")
      .delete()
      .not("candidate_id", "is", null);

    if (votesError) {
      console.error("Erreur de suppression des votes:", votesError.message);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Impossible de supprimer les votes."
        })
      };
    }

    // Supprimer ensuite tous les candidats.
    const { error: candidatesError } = await supabase
      .from("candidates")
      .delete()
      .not("id", "is", null);

    if (candidatesError) {
      console.error(
        "Erreur de suppression des candidats:",
        candidatesError.message
      );

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Les votes ont été supprimés, mais la suppression des candidats a échoué."
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Tous les candidats et leurs votes ont été supprimés."
      })
    };
  } catch (error) {
    console.error(
      "Erreur admin-delete-candidates:",
      error.message
    );

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Une erreur du serveur est survenue."
      })
    };
  }
};


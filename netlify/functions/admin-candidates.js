const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

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
      throw new Error("Configuration du serveur incomplète.");
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
        body: JSON.stringify({ error: "Connexion administrateur requise." })
      };
    }

    const [payload, signature] = parts;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (
      a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)
    ) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Session administrateur invalide." })
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
        body: JSON.stringify({ error: "Session invalide." })
      };
    }

    if (!session.exp || session.exp < Date.now()) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Session expirée." })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const name = String(body.name || "").trim();
    const class_name = String(body.className || body.class_name || "").trim();
    const program = String(body.program || "").trim();
    const photo_url = String(body.photoUrl || body.photo_url || "").trim();

    if (!name || !class_name || !program) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Le nom, la classe et le programme sont obligatoires."
        })
      };
    }

    if (
      name.length > 100 ||
      class_name.length > 50 ||
      program.length > 5000 ||
      photo_url.length > 1200000
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Un champ est trop long." })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("candidates")
      .insert([{
        name,
        class_name,
        program,
        photo_url: photo_url || null
      }])
      .select("id, name, class_name, program, photo_url")
      .single();

    if (error) {
      console.error("Erreur Supabase :", error.message);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Impossible d'enregistrer le candidat."
        })
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: "Candidat ajouté avec succès.",
        candidate: data
      })
    };
  } catch (error) {
    console.error("Erreur admin-candidates :", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Une erreur est survenue sur le serveur."
      })
    };
  }
};

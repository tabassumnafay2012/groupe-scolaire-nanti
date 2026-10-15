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
      body: JSON.stringify({ error: "Méthode non autorisée." })
    };
  }

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Configuration Supabase manquante.");
    }

    const body = JSON.parse(event.body || "{}");
    const candidateId = body.candidateId;

    if (!candidateId || typeof candidateId !== "string") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Candidat invalide." })
      };
    }

    const supabase = createClient(url, key);

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", candidateId)
      .maybeSingle();

    if (candidateError) throw candidateError;

    if (!candidate) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Ce candidat n'existe pas." })
      };
    }

    const { error: voteError } = await supabase
      .from("votes")
      .insert([{ candidate_id: candidateId }]);

    if (voteError) throw voteError;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ message: "Vote enregistré avec succès." })
    };
  } catch (error) {
    console.error("Erreur vote :", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Impossible d'enregistrer le vote. Réessaie plus tard."
      })
    };
  }
};

const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée." })
    };
  }

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Configuration Supabase manquante.");
    }

    const supabase = createClient(url, key);

    const { data: candidates, error: candidateError } =
      await supabase
        .from("candidates")
        .select("id, name, class_name, program, photo_url")
        .order("created_at", { ascending: true });

    if (candidateError) throw candidateError;

    const { data: votes, error: voteError } =
      await supabase
        .from("votes")
        .select("candidate_id");

    if (voteError) throw voteError;

    const counts = {};

    for (const vote of votes) {
      counts[vote.candidate_id] =
        (counts[vote.candidate_id] || 0) + 1;
    }

    const total = votes.length;

    const results = candidates.map((candidate) => {
      const count = counts[candidate.id] || 0;

      return {
        name: candidate.name,
        class_name: candidate.class_name,
        votes: count,
        percent: total ? (count / total) * 100 : 0
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ candidates, results })
    };
  } catch (error) {
    console.error("Erreur public-data :", error.message);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Impossible de charger les candidats et les résultats."
      })
    };
  }
};
Bravo ! 🎉👏 Le fichier admin-login.js est maintenant enregistré sur GitHub.
Nous allons maintenant ajouter la fonction qui permet au site d'afficher les candidats et les résultats des élections.
Étape 17 : créer public-data.js
💻 Sur ton ordinateur :
Retourne à la liste des fichiers de ton dépôt GitHub : github.com⁠�
Clique sur Add file.
Clique sur Create new file.
Dans le champ du nom, écris exactement :
netlify/functions/public-data.js
Dans la grande zone blanche, colle tout le code suivant :
JavaScript

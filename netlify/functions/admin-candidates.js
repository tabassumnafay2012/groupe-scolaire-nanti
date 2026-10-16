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

    // Vérifier la session administrateur.
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

    const body = JSON.parse(event.body || "{}");

    const name = String(body.name || "").trim();
    const className = String(body.className || "").trim();
    const program = String(body.program || "").trim();

    let photoUrl = String(body.photoUrl || "").trim();

    if (!name || !className) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Le nom et la classe sont obligatoires."
        })
      };
    }

    // Si la photo vient de la galerie, elle est reçue en Data URL.
    if (photoUrl.startsWith("data:")) {
      const match = photoUrl.match(
        /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/
      );

      if (!match) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "Format de photo non accepté. Utilise une image JPG, PNG, WEBP ou GIF."
          })
        };
      }

      const mimeType = match[1];
      const imageBuffer = Buffer.from(match[2], "base64");

      if (imageBuffer.length > 5 * 1024 * 1024) {
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({
            error: "La photo dépasse 5 Mo. Choisis une image plus légère."
          })
        };
      }

      const extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif"
      };

      const filePath =
        "candidats/" +
        Date.now() +
        "-" +
        crypto.randomUUID() +
        "." +
        extensions[mimeType];

      const { error: uploadError } = await supabase
        .storage
        .from("candidate-photos")
        .upload(filePath, imageBuffer, {
          contentType: mimeType,
          upsert: false
        });

      if (uploadError) {
        console.error("Erreur stockage photo:", uploadError.message);

        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Impossible d'enregistrer la photo. Vérifie le bucket Supabase."
          })
        };
      }

      const { data: publicData } = supabase
        .storage
        .from("candidate-photos")
        .getPublicUrl(filePath);

      photoUrl = publicData.publicUrl;
    }

    // Accepter uniquement les liens HTTPS pour les photos externes.
    if (
      photoUrl &&
      !photoUrl.startsWith("https://")
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Le lien de la photo doit commencer par https://."
        })
      };
    }

    // Enregistrer le candidat et le lien de sa photo.
    const { data, error } = await supabase
      .from("candidates")
      .insert({
        name: name,
        class_name: className,
        program: program,
        photo_url: photoUrl || null
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur ajout candidat:", error.message);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Impossible d'ajouter le candidat dans la base de données."
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        candidate: data,
        message: "Candidat ajouté avec succès."
      })
    };
  } catch (error) {
    console.error("Erreur admin-candidates:", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Une erreur du serveur est survenue."
      })
    };
  }
};

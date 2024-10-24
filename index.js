require("dotenv").config();

const { default: axios } = require("axios");

const services = JSON.parse(process.env.SERVICOS);

const locaisEnvio = JSON.parse(process.env.LOCAIS);

function get256RandomBits(returnAsString = true) {
  const uint8Array = new Uint8Array(32); // 32 bytes = 256 bits
  const rng = crypto.getRandomValues(uint8Array);
  if (returnAsString) {
    return Array.from(rng)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    return rng;
  }
}

const enviarMensagem = async (type, id, data) => {
  if (type === "whatsapp") {
    try {
      await axios.get(
        `${process.env.URL_WHATSAPP}/wp/account/${
          process.env.WHATSAPP_API_SECRET
        }/send?cmd=text&to=${id}&msg=${encodeURIComponent(data)}`
      );
    } catch (error) {
      console.error("Erro ao enviar mensagem para o WhatsApp", error);
    }
  } else if (type === "telegram") {
    try {
      await axios.post(
        `https://api.telegram.org/bot${process.env.TELEGRAM_API_KEY}/sendMessage`,
        {
          chat_id: id,
          text: data,
        }
      );
    } catch (error) {
      console.error("Erro ao enviar mensagem para o Telegram", error);
    }
  }
};

const checkServices = async (comando) => {
  let falhas = 0;
  let mensagens = [];
  console.log("Checando serviços...");

  for (let service of services) {
    try {
      console.log(`Checando ${service.name}...`);
      await axios.get(service.url, { timeout: 10000 });
      console.log(`Serviço ${service.name} is OK`);
      mensagens.push(`✅ -> ${service.name}`);
    } catch (error) {
      console.error(`Serviço ${service.name} is down`);
      mensagens.push(`⛔ -> ${service.name}`);
      falhas++;
    }
  }

  let date = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  let mensagem = "";
  if (comando && comando === "daily") {
    mensagem = `ℹ️ *Status do serviços* ℹ️\n\nData/Hora: ${date}\n\nEstes são os status dos serviços:\n\n${mensagens.join(
      "\n"
    )}`;
  } else if (falhas > 0) {
    mensagem = `🚨 *Alerta de Falha* 🚨\n\nData/Hora: ${date}\n\nUm ou mais serviços estão fora do ar:\n\n${mensagens.join(
      "\n"
    )}`;
  } else {
    return;
  }

  for (let local of locaisEnvio) {
    await enviarMensagem(local.type, local.id, mensagem);
  }
};

let comando = process.argv[process.argv.length - 1];

checkServices(comando);

const puppeteer = require('puppeteer');
const axios = require('axios');
const readline = require('readline');

// Função para obter cidades pelo estado (UF)
async function getCitiesByState(uf) {
  try {
    const urlIbge = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
    const response = await axios.get(urlIbge);
    return response.data.map(city => city.nome);
  } catch (error) {
    console.log(`Erro ao obter cidades do estado ${uf}: ${error.message}`);
    return [];
  }
}

// Função usando Puppeteer para obter coordenadas
async function getCoordinates(cityName, uf) {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const urlNominatim = `https://nominatim.openstreetmap.org/search?city=${cityName}&state=${uf}&country=Brazil&format=json`;

    await page.goto(urlNominatim);
    const content = await page.evaluate(() => document.body.innerText);
    const data = JSON.parse(content);

    await browser.close();

    if (data.length > 0) {
      const latitude = data[0].lat;
      const longitude = data[0].lon;
      return { latitude, longitude };
    } else {
      console.log(`Coordenadas não encontradas para ${cityName}, ${uf}`);
      return { latitude: null, longitude: null };
    }
  } catch (error) {
    console.log(`Erro ao obter coordenadas para ${cityName}, ${uf}: ${error.message}`);
    return { latitude: null, longitude: null };
  }
}

// Função para buscar lojas da Vivo usando coordenadas
async function getVivoStoresByRadius(latitude, longitude, cityName) {
  const url = 'https://www.vivo4g.com.br/api/stores/get-by-radius/1Fjs2otl1wEZtRF8JNHavRrzmSEBFgTJWwpPNPk_5nKQ/proprias';
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.7',
    'Connection': 'keep-alive',
    'Origin': 'https://plataforma.portal.vivo.com.br',
    'Referer': 'https://plataforma.portal.vivo.com.br/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-GPC': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
  const params = {
    fromLatitude: latitude,
    fromLongitude: longitude,
    ownStore: 'false',
  };

  try {
    const response = await axios.get(url, { headers, params });
    if (response.data && response.data.data && response.data.data.length > 0) {
      console.log(`\x1b[32m✓ Lojas encontradas nas coordenadas fornecidas para ${cityName}:\x1b[0m`);
      response.data.data.forEach(store => {
        console.log('\x1b[36m' + '='.repeat(50) + '\x1b[0m');
        console.log(`\x1b[33mNome:\x1b[0m ${store.nomeSite}`);
        console.log(`\x1b[33mID da Loja:\x1b[0m ${store.idLoja}`);
        console.log(`\x1b[33mEndereço:\x1b[0m ${store.endereco}`);
        console.log(`\x1b[33mDistância:\x1b[0m ${store.haversineDistance.toFixed(2)} km`);
        console.log(`\x1b[33mWhatsApp:\x1b[0m ${store.whatsapp}`);
        console.log('\n\x1b[33mHorário de Funcionamento:\x1b[0m');
        console.log(`  Segunda-feira: ${store.abreSegundaFeira || 'Fechado'}`);
        console.log(`  Terça-feira: ${store.abreTercaFeira || 'Fechado'}`);
        console.log(`  Quarta-feira: ${store.abreQuartaFeira || 'Fechado'}`);
        console.log(`  Quinta-feira: ${store.abreQuintaFeira || 'Fechado'}`);
        console.log(`  Sexta-feira: ${store.abreSextaFeira || 'Fechado'}`);
        console.log(`  Sábado: ${store.abreSabado || 'Fechado'}`);
        console.log(`  Domingo: ${store.abreDomingo === 'sim' ? 'Aberto' : 'Fechado'}`);
        console.log(`  Feriados: ${store.abreFeriado === 'sim' ? 'Aberto' : 'Fechado'}`);
        if (store.servicostelecomatend) {
          console.log(`\x1b[33mInformações Adicionais:\x1b[0m ${store.servicostelecomatend}`);
        }
        console.log('\x1b[36m' + '='.repeat(50) + '\x1b[0m');
      });
      return response.data.data;
    } else {
      console.log(`\x1b[31m✗ Nenhuma loja Vivo encontrada em ${cityName}\x1b[0m`);
      console.log('\x1b[36m' + '='.repeat(50) + '\x1b[0m');
      return [];
    }
  } catch (error) {
    console.log(`\x1b[31m✗ Erro na requisição para lojas Vivo em ${cityName}: ${error.message}\x1b[0m`);
    console.log('\x1b[36m' + '='.repeat(50) + '\x1b[0m');
    return [];
  }
}

// Função para listar cidades com coordenadas e lojas
async function listCitiesWithCoordinatesAndStores(uf) {
  const cities = await getCitiesByState(uf);
  const results = {};

  for (const city of cities) {
    const { latitude, longitude } = await getCoordinates(city, uf);
    if (latitude && longitude) {
      const stores = await getVivoStoresByRadius(latitude, longitude, city);
      results[city] = {
        coordinates: { latitude, longitude },
        stores: stores,
      };
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Espera de 1 segundo entre as requisições
  }

  return results;
}

// Programa principal para solicitar UF do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Digite o código do estado (UF): ", async uf => {
  const results = await listCitiesWithCoordinatesAndStores(uf.toLowerCase());
  console.log("Resultados:", JSON.stringify(results, null, 2));
  rl.close();
});

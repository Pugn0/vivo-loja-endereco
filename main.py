from colorama import init, Fore, Style
import requests
import time

def get_cities_by_state(uf):
    try:
        url_ibge = f"https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios"
        response = requests.get(url_ibge)
        response.raise_for_status()
        cities_data = response.json()
        
        cities = []
        for city in cities_data:
            city_name = city['nome']
            cities.append(city_name)
        return cities
    except Exception as e:
        print(f"Erro ao obter cidades do estado {uf}: {str(e)}")
        return []

def get_coordinates(city_name, uf):
    try:
        url_nominatim = f"https://nominatim.openstreetmap.org/search?city={city_name}&state={uf}&country=Brazil&format=json"
        response = requests.get(url_nominatim)
        response.raise_for_status()
        data = response.json()
        
        if data:
            latitude = data[0]['lat']
            longitude = data[0]['lon']
            return latitude, longitude
        else:
            print(f"Coordenadas não encontradas para {city_name}, {uf}")
            return None, None
    except Exception as e:
        print(f"Erro ao obter coordenadas para {city_name}, {uf}: {str(e)}")
        return None, None

def get_vivo_stores_by_radius(latitude, longitude, city_name):
    # Inicializa o colorama para funcionar no Windows também
    init()
    
    url = f'https://www.vivo4g.com.br/api/stores/get-by-radius/1Fjs2otl1wEZtRF8JNHavRrzmSEBFgTJWwpPNPk_5nKQ/proprias'
    headers = {
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
        'sec-ch-ua-platform': '"Windows"'
    }
    
    params = {
        'fromLatitude': latitude,
        'fromLongitude': longitude,
        'ownStore': 'false'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        if data.get("data"):
            print(f"{Fore.GREEN}✓ Lojas encontradas nas coordenadas fornecidas!{Style.RESET_ALL}")
            for store in data["data"]:
                print(f"{Fore.CYAN}Nome: {store.get('name')}")
                print(f"Endereço: {store.get('address')}")
                print(f"Distância: {store.get('distance')}km{Style.RESET_ALL}")
                print("-" * 50)
            return data["data"]
        else:
            print(f"{Fore.RED}✗ Nenhuma loja encontrada para as coordenadas: {latitude}, {longitude}, {city_name}{Style.RESET_ALL}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"{Fore.RED}✗ Erro na requisição: {str(e)}{Style.RESET_ALL}")
        return []

def list_cities_with_coordinates_and_stores(uf):
    cities = get_cities_by_state(uf)
    results = {}

    for city in cities:
        lat, lon = get_coordinates(city, uf)
        if lat and lon:
            stores = get_vivo_stores_by_radius(lat, lon, city)
            results[city] = {
                'coordinates': {'latitude': lat, 'longitude': lon},
                'stores': stores
            }
            time.sleep(1)  # Para evitar sobrecarga nas APIs

    return results

# Exemplo de uso atualizado
uf = input("Digite o código do estado (UF): ").lower()

results = list_cities_with_coordinates_and_stores(uf)

// src/app/services/weather.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // 'of' é para Observables que emitem um único valor
import { map, catchError } from 'rxjs/operators'; // Operadores para transformar e lidar com erros
import { environment } from '../../environments/environment'; // !!! VERIFIQUE ESTE CAMINHO !!!

// --- Interfaces de Dados ---
// Estas interfaces devem corresponder à estrutura exata dos dados que a API retorna.

// Para geocoding (busca de coordenadas por cidade)
export interface GeocodeResult {
  name: string;
  local_names?: { [key: string]: string };
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

// Para o objeto 'main' das condições atuais e previsão
// Inclui 'feels_like', 'pressure', 'humidity' para resolver erros de tipagem.
export interface MainData {
  temp: number;
  feels_like: number; // <--- Importante para corrigir o erro 'feels_like'
  temp_min: number;
  temp_max: number;
  pressure: number;   // <--- Importante para corrigir o erro 'pressure'
  humidity: number;   // <--- Importante para corrigir o erro 'humidity'
  sea_level?: number; // Opcional
  grnd_level?: number; // Opcional
}

// Para o objeto 'weather' (descrição e ícone)
export interface WeatherDescription {
  id: number;
  main: string;
  description: string;
  icon: string;
}

// Para o objeto 'wind'
export interface WindData {
  speed: number;
  deg: number;
  gust?: number; // Opcional
}

// Para o objeto 'clouds'
export interface CloudsData {
  all: number;
}

// Para o objeto 'sys' (país, nascer/pôr do sol) para condições atuais
export interface SysCurrent {
  type: number;
  id: number;
  country: string;
  sunrise: number;
  sunset: number;
}

// Para o objeto 'sys' (parte do dia) para previsão (Ex: 'd' para dia, 'n' para noite)
export interface SysForecast {
  pod: string;
}

// Resposta completa das condições meteorológicas atuais (Current Weather API)
export interface WeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: WeatherDescription[];
  base: string;
  main: MainData; // Contém 'feels_like', 'pressure', 'humidity'
  visibility: number;
  wind: WindData;
  clouds: CloudsData;
  dt: number; // Unix timestamp
  sys: SysCurrent;
  timezone: number;
  id: number;
  name: string; // Nome da cidade
  cod: number;
}

// Item individual da lista de previsão (cada 3 horas na API do OpenWeatherMap)
// Inclui 'pop' para resolver o erro de tipagem.
export interface ForecastItem {
  dt: number; // Unix timestamp
  main: MainData; // Contém 'feels_like', 'humidity'
  weather: WeatherDescription[];
  clouds: CloudsData;
  wind: WindData;
  visibility: number;
  pop: number; // <--- Importante para corrigir o erro 'pop'
  sys: SysForecast;
  dt_txt: string; // Data e hora em formato string
  rain?: { '1h'?: number; '3h'?: number }; // Opcional, para dados de chuva
  snow?: { '1h'?: number; '3h'?: number }; // Opcional, para dados de neve
}

// Resposta completa da API de previsão (5-day / 3-hour forecast API)
export interface ForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: ForecastItem[]; // Lista de itens de previsão
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}


@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private apiUrl = 'https://api.openweathermap.org/data/2.5';
  private geoApiUrl = 'https://api.openweathermap.org/geo/1.0';
  private apiKey = environment.openWeatherKey; // Obtém a chave da API do ambiente

  constructor(private http: HttpClient) { }

  // Função para obter coordenadas geográficas de uma cidade
  geocode(city: string): Observable<GeocodeResult> {
    const url = `${this.geoApiUrl}/direct?q=${city}&limit=1&appid=${this.apiKey}`;
    return this.http.get<GeocodeResult[]>(url).pipe(
      map(results => {
        // Verifica se há resultados. Se sim, retorna o primeiro.
        if (results && results.length > 0) { // <--- CORREÇÃO: Usa .length no array retornado pelo Observable.
          return results[0];
        }
        // Se não houver resultados, loga um aviso e retorna coordenadas padrão para Lisboa.
        console.warn(`Cidade "${city}" não encontrada via geocoding. Usando coordenadas padrão para Lisboa.`);
        return {
          name: city,
          lat: 38.72,
          lon: -9.14,
          country: 'PT',
          local_names: {}, // Objeto vazio, conforme interface
          state: undefined // Indefinido, conforme interface
        } as GeocodeResult; // Garante que o tipo é GeocodeResult
      }),
      // Lida com erros na própria requisição HTTP (ex: erro de rede, erro 401/404 da API)
      catchError(error => {
        console.error('Erro na requisição de geocoding:', error);
        // Em caso de erro, retorna um Observable com coordenadas padrão para Lisboa.
        return of({
          name: city,
          lat: 38.72,
          lon: -9.14,
          country: 'PT',
          local_names: {},
          state: undefined
        } as GeocodeResult);
      })
    );
  }

  // Função para obter condições meteorológicas atuais por coordenadas
  getCurrentByGeo(lat: number, lon: number): Observable<WeatherResponse> {
    const url = `${this.apiUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=pt_br`;
    return this.http.get<WeatherResponse>(url);
  }

  // Função para obter previsão horária por coordenadas
  getForecastByGeo(lat: number, lon: number): Observable<ForecastResponse> {
    const url = `${this.apiUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=pt_br`;
    return this.http.get<ForecastResponse>(url);
  }
}
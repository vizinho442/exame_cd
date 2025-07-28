// src/app/services/air-quality.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // Para mapear a resposta da API
import { environment } from '../../environments/environment'; // !!! VERIFIQUE ESTE CAMINHO !!!

// --- Interfaces de Dados para a API WAQI ---
// Estas interfaces são simplificadas com base no uso comum da API WAQI.
// Pode precisar de as expandir se usar mais dados.

export interface AirStationData {
  name: string;
  url: string;
}

// Representa um item de estação de qualidade do ar retornado pela API WAQI
export interface AirStation {
  uid: number;
  aqi: number; // Air Quality Index
  time: {
    s: string; // timestamp string
  };
  station: AirStationData;
  lat: number;
  lon: number;
}

// Resposta da API WAQI (geralmente encapsulada com um "data" object)
export interface WaqiResponse {
  status: string; // "ok" or "error"
  data: AirStation[]; // Lista de estações próximas
}


@Injectable({
  providedIn: 'root'
})
export class AirQualityService {
  private waqiApiUrl = 'https://api.waqi.info/feed/'; // URL base da API WAQI
  private waqiToken = environment.waqiToken; // Obtém o token do ambiente

  constructor(private http: HttpClient) { }

  // Obtém estações de qualidade do ar próximas a uma coordenada
  nearby(lat: number, lon: number): Observable<AirStation[]> {
    // Exemplo de URL para obter estações próximas:
    // https://api.waqi.info/feed/geo:LAT;LON/?token=YOUR_TOKEN
    const url = `${this.waqiApiUrl}geo:${lat};${lon}/?token=${this.waqiToken}`;

    return this.http.get<WaqiResponse>(url).pipe(
      map(response => {
        if (response.status === 'ok' && response.data) {
          return response.data; // Retorna o array de estações
        } else {
          console.warn('WAQI API returned an error or no data:', response);
          return []; // Retorna um array vazio em caso de erro ou sem dados
        }
      })
    );
  }
}
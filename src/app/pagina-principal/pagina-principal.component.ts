// src/app/pagina-principal/pagina-principal.component.ts

import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { catchError, of, map } from 'rxjs';

import {
  WeatherService,
  GeocodeResult,
  WeatherResponse,
  ForecastResponse,
  ForecastItem
} from '../services/weather.service';
import { AirQualityService, AirStation } from '../services/air-quality.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-pagina-principal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './pagina-principal.component.html',
  styleUrls: ['./pagina-principal.component.css']
})
export class PaginaPrincipalComponent implements OnInit, AfterViewInit {
  @ViewChild('mapElement', { static: false }) mapRef!: ElementRef<HTMLDivElement>;

  public cities = ['Lisboa', 'Madrid', 'Paris', 'Nova York'];
  public city = this.cities[0];
  public loading = true;
  public isDarkMode = false;
  public currentLayer: 'precipitation' | 'pressure' | 'aqi' = 'precipitation';

  private map!: L.Map;
  private baseLayer!: L.TileLayer; // Camada de mapa base (ruas, etc.)
  private overlayLayer?: L.TileLayer; // Camada de sobreposição (precipitação, pressão, AQI)
  private aqiMarkers: L.CircleMarker[] = [];

  public currentWeather?: WeatherResponse;
  public forecastData?: ForecastResponse;
  public aqiStations: AirStation[] = [];

  private weatherSvc = inject(WeatherService);
  private aqiSvc = inject(AirQualityService);

  ngOnInit(): void {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode = true;
    } else {
      this.isDarkMode = false;
    }
    document.body.classList.toggle('dark', this.isDarkMode);

    this.reloadAll();
  }

  ngAfterViewInit(): void {
    const el = this.mapRef.nativeElement;
    this.map = L.map(el, {
      zoomControl: false
    }).setView([38.72, -9.14], 9);
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    // ADICIONAR CAMADA BASE DO MAPA (OpenStreetMap) <--- NOVA ADIÇÃO AQUI
    this.baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'] // Geralmente recomendado para melhor carregamento
    }).addTo(this.map);

    this.changeLayer(this.currentLayer); // Carrega a camada de sobreposição inicial
    this.map.invalidateSize();
  }

  public onSearch(): void {
    this.reloadAll();
  }

  public reloadAll(): void {
    this.loading = true;

    this.weatherSvc.geocode(this.city).subscribe({
      next: ({ lat, lon }: GeocodeResult) => {
        this.map.setView([lat, lon], 9);

        // 1) Obter condições meteorológicas atuais
        this.weatherSvc.getCurrentByGeo(lat, lon).pipe(
          catchError(err => {
            console.error('Erro ao obter tempo atual:', err);
            return of(undefined as any);
          })
        ).subscribe(res => {
          this.currentWeather = res;
        });

        // 2) Obter previsão horária
        this.weatherSvc.getForecastByGeo(lat, lon).pipe(
          catchError(err => {
            console.error('Erro ao obter previsão horária:', err);
            return of({
              cod: '500',
              message: 0,
              cnt: 0,
              list: [],
              city: {
                id: 0,
                name: this.city,
                coord: { lat: lat, lon: lon },
                country: 'N/A',
                population: 0,
                timezone: 0,
                sunrise: 0,
                sunset: 0,
              },
            } as ForecastResponse);
          })
        ).subscribe(f => {
          this.forecastData = f;
        });

        // 3) Obter estações de Qualidade do Ar (AQI)
        this.aqiSvc.nearby(lat, lon).pipe(
          catchError(err => {
            console.error('Erro ao obter estações AQI:', err);
            return of([] as AirStation[]);
          })
        ).subscribe(stations => {
          this.aqiStations = stations;
          this.drawStations();
        });

        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erro no geocoding:', err);
        this.loading = false;
      }
    });
  }

  // MUDANÇAS NA FUNÇÃO changeLayer PARA GERIR CAMADA BASE E CAMADAS DE SOBREPOSIÇÃO
  public changeLayer(type: 'precipitation' | 'pressure' | 'aqi'): void {
    // Remove a camada de sobreposição atual, se existir
    if (this.overlayLayer) {
      this.map.removeLayer(this.overlayLayer);
      this.overlayLayer = undefined;
    }

    // Remove os marcadores AQI se mudar para uma camada que não seja AQI
    this.aqiMarkers.forEach(marker => this.map.removeLayer(marker));
    this.aqiMarkers = [];

    this.currentLayer = type; // Atualiza a camada selecionada no UI

    let url: string;
    let opts: L.TileLayerOptions;

    if (type === 'aqi') {
      // URL para tiles da API WAQI.
      url = `https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${environment.waqiToken}`;
      opts = { opacity: 0.6, attribution: '© WAQI.org' };
      this.drawStations(); // Redesenha os marcadores AQI se a camada AQI for selecionada
    } else {
      // URL para tiles da API OpenWeatherMap (precipitação/pressão).
      url = `https://tile.openweathermap.org/map/${type}_new/{z}/{x}/{y}.png?appid=${environment.openWeatherKey}`;
      opts = { opacity: 0.5, attribution: '© OpenWeatherMap' };
    }

    // Adiciona a nova camada de sobreposição
    this.overlayLayer = L.tileLayer(url, opts).addTo(this.map);
    this.map.invalidateSize(); // Garante que o mapa se ajusta ao tamanho do contêiner
  }

  private drawStations(): void {
    this.aqiMarkers.forEach(marker => this.map.removeLayer(marker));
    this.aqiMarkers = [];

    if (this.currentLayer === 'aqi' && this.aqiStations.length > 0) {
      this.aqiStations.forEach(s => {
        const marker = L.circleMarker([s.lat, s.lon], {
          radius: 6,
          fillColor: this.getAqiColor(s.aqi),
          color: '#fff',
          weight: 1,
          fillOpacity: 1
        })
        .bindTooltip(`AQI: ${s.aqi} - ${s.station.name}`)
        .addTo(this.map);
        this.aqiMarkers.push(marker);
      });
    }
  }

  public toggleDark(): void {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark', this.isDarkMode);
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  public getWeatherIcon(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  public getAqiColorClass(aqi: number): string {
    if (aqi <= 50) return 'text-green-600';
    if (aqi <= 100) return 'text-yellow-500';
    if (aqi <= 150) return 'text-orange-500';
    if (aqi <= 200) return 'text-red-600';
    if (aqi <= 300) return 'text-purple-600';
    return 'text-red-900';
  }

  private getAqiColor(aqi: number): string {
    if (aqi <= 50) return '#28a745';
    if (aqi <= 100) return '#ffc107';
    if (aqi <= 150) return '#fd7e14';
    if (aqi <= 200) return '#dc3545';
    if (aqi <= 300) return '#6f42c1';
    return '#6610f2';
  }

  public getAqiDescription(aqi: number): string {
    if (aqi <= 50) return 'Bom';
    if (aqi <= 100) return 'Moderado';
    if (aqi <= 150) return 'Prejudicial para Grupos Sensíveis';
    if (aqi <= 200) return 'Prejudicial';
    if (aqi <= 300) return 'Muito Prejudicial';
    return 'Perigoso';
  }
}
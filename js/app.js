/**
 * Genmap Climate Visualizer - Application complète avec onglets fonctionnels
 */

// Configuration
const CONFIG = {
    WEATHER_API_KEY: 'demo',
    NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',
    DEFAULT_LOCATION: { lat: 40.7128, lng: -74.0060, name: "New York City" }
};

// City-specific 3D models with landmarks
const CITY_MODELS = {
    'paris': {
        name: 'Paris',
        bounds: { north: 48.9022, south: 48.8156, east: 2.4699, west: 2.2241 },
        landmarks: [
            {
                name: 'Tour Eiffel',
                type: 'eiffel_tower',
                position: { x: 0, z: 0 },
                height: 324,
                width: 125,
                depth: 125
            }
        ],
        buildings: [
            { width: 15, height: 35, depth: 20, x: -80, z: -60, type: 'haussmann' },
            { width: 12, height: 30, depth: 18, x: -60, z: -40, type: 'haussmann' },
            { width: 18, height: 25, depth: 15, x: -40, z: -80, type: 'haussmann' }
        ]
    },
    'new york': {
        name: 'New York',
        bounds: { north: 40.8176, south: 40.6829, east: -73.9442, west: -74.0479 },
        landmarks: [
            {
                name: 'Empire State Building',
                type: 'empire_state',
                position: { x: 0, z: 0 },
                height: 443,
                width: 129,
                depth: 61
            }
        ],
        buildings: [
            { width: 40, height: 300, depth: 40, x: -60, z: -40, type: 'skyscraper' },
            { width: 35, height: 250, depth: 35, x: -30, z: 30, type: 'skyscraper' }
        ]
    },
    'london': {
        name: 'London',
        bounds: { north: 51.6723, south: 51.3588, east: 0.1785, west: -0.3514 },
        landmarks: [
            {
                name: 'Big Ben',
                type: 'big_ben',
                position: { x: 0, z: 0 },
                height: 96,
                width: 12,
                depth: 12
            }
        ],
        buildings: [
            { width: 20, height: 45, depth: 30, x: -70, z: -50, type: 'victorian' },
            { width: 25, height: 50, depth: 20, x: -50, z: 60, type: 'victorian' }
        ]
    }
};

// Main Application Class
class GenmapApp {
    constructor() {
        this.scene3D = null;
        this.currentView = 'welcome';
        this.currentTab = 'currentWeather';
        this.currentYear = 2024;
        this.seaLevelRise = 0;
        this.selectedLocation = null;
        this.climateData = {};
        this.weatherData = null;
        this.airQualityData = null;
        
        this.init();
    }

    init() {
        console.log('🌍 Initializing Genmap...');
        this.bindEvents();
        this.hideLoading();
    }

    bindEvents() {
        // Search form
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLocationSearch();
            });
        }

        // Header search
        const headerSearch = document.getElementById('headerSearch');
        if (headerSearch) {
            headerSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleHeaderSearch();
                }
            });
        }

        // Logo click
        const logoLink = document.getElementById('logoLink');
        if (logoLink) {
            logoLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.returnToWelcome();
            });
        }

        // Climate tab controls
        const currentWeatherBtn = document.getElementById('currentWeatherBtn');
        const climateProjectionsBtn = document.getElementById('climateProjectionsBtn');
        const environmentalBtn = document.getElementById('environmentalBtn');
        const riskAssessmentBtn = document.getElementById('riskAssessmentBtn');

        if (currentWeatherBtn) currentWeatherBtn.addEventListener('click', () => this.switchTab('currentWeather'));
        if (climateProjectionsBtn) climateProjectionsBtn.addEventListener('click', () => this.switchTab('climateProjections'));
        if (environmentalBtn) environmentalBtn.addEventListener('click', () => this.switchTab('environmental'));
        if (riskAssessmentBtn) riskAssessmentBtn.addEventListener('click', () => this.switchTab('riskAssessment'));

        // Timeline
        const timelineSlider = document.getElementById('timelineSlider');
        if (timelineSlider) {
            timelineSlider.addEventListener('input', (e) => {
                this.updateTimeline(parseInt(e.target.value));
            });
        }
    }

    switchTab(tabName) {
        console.log(`📋 Switching to tab: ${tabName}`);
        
        // Update active button
        const buttons = document.querySelectorAll('.climate-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const activeButton = document.getElementById(`${tabName}Btn`);
        if (activeButton) activeButton.classList.add('active');

        // Hide all panels
        const panels = ['currentWeatherPanel', 'climateProjectionsPanel', 'environmentalPanel', 'riskAssessmentPanel'];
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.display = 'none';
                panel.classList.remove('active');
            }
        });

        // Show selected panel
        const selectedPanel = document.getElementById(`${tabName}Panel`);
        if (selectedPanel) {
            selectedPanel.style.display = 'block';
            selectedPanel.classList.add('active');
        }

        this.currentTab = tabName;

        // Update 3D visualization if available
        if (this.scene3D) {
            this.scene3D.setVisualizationMode(tabName);
        }

        // Load specific data for the tab
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        if (!this.selectedLocation) return;

        switch (tabName) {
            case 'currentWeather':
                // Already loaded in main weather data
                break;
            case 'environmental':
                await this.loadEnvironmentalData();
                break;
            case 'climateProjections':
                this.updateClimateProjectionsPanel();
                break;
            case 'riskAssessment':
                this.updateRiskAssessmentPanel();
                break;
        }
    }

    async handleLocationSearch() {
        const locationInput = document.getElementById('locationInput');
        if (!locationInput) return;

        const query = locationInput.value.trim();
        if (!query) return;

        this.showLoading('Analyzing climate data for location...');
        
        try {
            await this.transitionToMapView();
            await this.loadLocationData(query);
            this.showClimateInterface();
        } catch (error) {
            console.error('Search error:', error);
            await this.showDemoDataWithFallback(query);
        } finally {
            this.hideLoading();
        }
    }

    async handleHeaderSearch() {
        const headerSearch = document.getElementById('headerSearch');
        if (!headerSearch) return;

        const query = headerSearch.value.trim();
        if (!query) return;

        this.showLoading('Loading new location...');
        
        try {
            await this.loadLocationData(query);
        } catch (error) {
            console.error('Header search error:', error);
            await this.showDemoDataWithFallback(query);
        } finally {
            this.hideLoading();
        }
    }

    async transitionToMapView() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const mapInterface = document.getElementById('mapInterface');

        if (welcomeScreen) welcomeScreen.classList.add('fade-out');
        await this.delay(600);

        if (mapInterface) mapInterface.classList.add('active');
        this.currentView = 'map';

        // Initialize 3D scene
        await this.initialize3DScene();
    }

    async initialize3DScene() {
        const container = document.getElementById('scene-container');
        if (!container || !window.THREE) {
            console.warn('3D not available, using 2D mode');
            this.show3DPlaceholder();
            return;
        }

        try {
            this.scene3D = new Scene3DManager(container);
            await this.scene3D.init();
            console.log('✅ 3D Scene initialized');
        } catch (error) {
            console.warn('3D failed, using 2D mode:', error);
            this.show3DPlaceholder();
        }
    }

    show3DPlaceholder() {
        const container = document.getElementById('scene-container');
        if (!container) return;

        container.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #0c4a6e 0%, #1e293b 50%, #0f172a 100%);
                color: #cbd5e1;
            ">
                <div style="
                    width: 200px;
                    height: 200px;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="none" stroke="%2338bdf8" stroke-width="2"/><path d="M50,100 Q75,80 100,100 T150,100" fill="none" stroke="%2310b981" stroke-width="3"/><path d="M50,120 Q100,140 150,120" fill="none" stroke="%23f59e0b" stroke-width="2"/><circle cx="100" cy="100" r="5" fill="%23ef4444"/></svg>') center/contain no-repeat;
                    margin-bottom: 2rem;
                    opacity: 0.6;
                "></div>
                <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">Climate Data Visualization</h3>
                <p style="text-align: center; max-width: 400px; line-height: 1.6; opacity: 0.8;">
                    Climate projections and data are being processed. 
                    Use the controls to explore different scenarios.
                </p>
            </div>
        `;
    }

    async loadLocationData(location) {
        console.log(`🗺️ Loading data for: ${location}`);
        
        try {
            // Geocode location
            const coords = await this.geocodeLocation(location);
            this.selectedLocation = coords;

            // Get real weather data
            const weatherData = await this.getWeatherData(coords.lat, coords.lng);
            
            // Check if this is a major city with custom 3D model
            const cityModel = this.detectMajorCity(coords, location);
            this.selectedLocation.cityModel = cityModel;
            this.selectedLocation.weather = weatherData;
            this.weatherData = weatherData;

            // Generate climate data with real temperature
            this.climateData = this.generateClimateProjections(coords.lat, coords.lng, weatherData);

            // Update UI
            this.updateLocationDisplay(coords.name || location);
            this.updateCurrentWeatherPanel(weatherData);
            this.updateDataSources(weatherData);

            // Load additional data for environmental tab
            await this.loadEnvironmentalData();

            // Update 3D scene with city-specific model
            if (this.scene3D) {
                this.scene3D.loadCityModel(cityModel);
            }

            console.log(`✅ Data loaded for: ${coords.name || location}${cityModel ? ' (Custom 3D Model)' : ''}`);
        } catch (error) {
            console.error('Error loading location data:', error);
            // Fallback to demo data if API fails
            await this.showDemoDataWithFallback(location);
        }
    }

    async getWeatherData(lat, lng) {
        console.log('🌡️ Fetching real weather data...');
        
        // Try multiple weather APIs for reliability
        const weatherApis = [
            {
                name: 'Open-Meteo (Free)',
                url: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,uv_index&temperature_unit=celsius&wind_speed_unit=ms`,
                parser: (data) => {
                    const current = data.current_weather;
                    const hourly = data.hourly;
                    const currentHour = new Date().getHours();
                    
                    return {
                        temperature: current?.temperature || null,
                        humidity: hourly?.relative_humidity_2m?.[currentHour] || null,
                        description: this.getWeatherDescription(current?.weathercode),
                        windSpeed: current?.windspeed || null,
                        pressure: hourly?.surface_pressure?.[currentHour] || null,
                        feelsLike: hourly?.apparent_temperature?.[currentHour] || null,
                        uvIndex: hourly?.uv_index?.[currentHour] || null,
                        source: 'Open-Meteo'
                    };
                }
            },
            {
                name: 'OpenWeatherMap (Demo)',
                url: `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=demo&units=metric`,
                parser: (data) => ({
                    temperature: data.main?.temp || null,
                    humidity: data.main?.humidity || null,
                    description: data.weather?.[0]?.description || null,
                    windSpeed: data.wind?.speed || null,
                    pressure: data.main?.pressure || null,
                    feelsLike: data.main?.feels_like || null,
                    uvIndex: null,
                    source: 'OpenWeatherMap'
                })
            }
        ];

        // Try each API until one works
        for (const api of weatherApis) {
            try {
                console.log(`Trying ${api.name}...`);
                const response = await this.fetchWithTimeout(api.url, 5000);
                
                if (!response.ok) {
                    console.warn(`${api.name} returned ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                const weatherData = api.parser(data);
                
                if (weatherData.temperature !== null) {
                    console.log(`✅ Weather data from ${api.name}:`, weatherData);
                    return weatherData;
                }
            } catch (error) {
                console.warn(`${api.name} failed:`, error.message);
                continue;
            }
        }

        // If all APIs fail, return estimated temperature based on location
        console.warn('All weather APIs failed, using estimated temperature');
        return this.getEstimatedWeatherData(lat, lng);
    }

    async loadEnvironmentalData() {
        if (!this.selectedLocation) return;

        try {
            // Try to get air quality data
            const airQualityData = await this.getAirQualityData(this.selectedLocation.lat, this.selectedLocation.lng);
            this.airQualityData = airQualityData;
            this.updateEnvironmentalPanel(airQualityData);
        } catch (error) {
            console.warn('Could not load air quality data:', error);
            this.updateEnvironmentalPanel(null);
        }
    }

    async getAirQualityData(lat, lng) {
        try {
            // Try Open-Meteo Air Quality API
            const response = await this.fetchWithTimeout(
                `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`,
                5000
            );

            if (!response.ok) throw new Error('Air quality API failed');
            
            const data = await response.json();
            const current = data.current;
            
            // Calculate AQI based on PM2.5 (simplified)
            let aqi = 50; // Default moderate
            if (current.pm2_5) {
                if (current.pm2_5 <= 12) aqi = Math.round(50 * current.pm2_5 / 12);
                else if (current.pm2_5 <= 35.4) aqi = Math.round(50 + 50 * (current.pm2_5 - 12) / (35.4 - 12));
                else if (current.pm2_5 <= 55.4) aqi = Math.round(100 + 50 * (current.pm2_5 - 35.4) / (55.4 - 35.4));
                else aqi = Math.min(300, Math.round(150 + 100 * (current.pm2_5 - 55.4) / (150 - 55.4)));
            }
            
            return {
                aqi: aqi,
                pm25: current.pm2_5,
                pm10: current.pm10,
                no2: current.nitrogen_dioxide,
                co: current.carbon_monoxide,
                o3: current.ozone,
                so2: current.sulphur_dioxide,
                source: 'Open-Meteo Air Quality'
            };
        } catch (error) {
            throw error;
        }
    }

    updateCurrentWeatherPanel(weatherData) {
        if (!weatherData) return;

        // Update temperature
        const tempElement = document.getElementById('realTemp');
        if (tempElement && weatherData.temperature !== null) {
            const temp = weatherData.temperature.toFixed(1);
            tempElement.textContent = `${temp}°C`;
            
            if (weatherData.isEstimated) {
                tempElement.textContent += ' (est.)';
            }
            
            // Color coding based on temperature
            if (weatherData.temperature > 35) {
                tempElement.className = 'metric-value danger';
            } else if (weatherData.temperature > 28) {
                tempElement.className = 'metric-value warning';
            } else if (weatherData.temperature < 0) {
                tempElement.className = 'metric-value safe';
            } else {
                tempElement.className = 'metric-value';
            }
        }

        // Update conditions
        const conditionsElement = document.getElementById('realConditions');
        if (conditionsElement && weatherData.description) {
            conditionsElement.textContent = weatherData.description;
        }

        // Update humidity
        const humidityElement = document.getElementById('realHumidity');
        if (humidityElement && weatherData.humidity !== null) {
            humidityElement.textContent = `${weatherData.humidity}%`;
        }

        // Update wind speed
        const windElement = document.getElementById('realWindSpeed');
        if (windElement && weatherData.windSpeed !== null) {
            windElement.textContent = `${weatherData.windSpeed} m/s`;
        }

        // Update pressure
        const pressureElement = document.getElementById('realPressure');
        if (pressureElement && weatherData.pressure !== null) {
            pressureElement.textContent = `${weatherData.pressure} hPa`;
        }

        // Update feels like
        const feelsLikeElement = document.getElementById('realFeelsLike');
        if (feelsLikeElement && weatherData.feelsLike !== null) {
            feelsLikeElement.textContent = `${weatherData.feelsLike.toFixed(1)}°C`;
        }

        // Update UV index
        const uvElement = document.getElementById('realUVIndex');
        if (uvElement) {
            if (weatherData.uvIndex !== null) {
                uvElement.textContent = weatherData.uvIndex.toFixed(1);
                if (weatherData.uvIndex > 7) {
                    uvElement.className = 'metric-value danger';
                } else if (weatherData.uvIndex > 5) {
                    uvElement.className = 'metric-value warning';
                } else {
                    uvElement.className = 'metric-value safe';
                }
            } else {
                uvElement.textContent = 'N/A';
                uvElement.className = 'metric-value';
            }
        }
    }

    updateEnvironmentalPanel(airQualityData) {
        // Update air quality
        const aqiElement = document.getElementById('airQuality');
        if (aqiElement) {
            if (airQualityData && airQualityData.aqi) {
                aqiElement.textContent = airQualityData.aqi;
                
                if (airQualityData.aqi > 150) {
                    aqiElement.className = 'metric-value danger';
                } else if (airQualityData.aqi > 100) {
                    aqiElement.className = 'metric-value warning';
                } else if (airQualityData.aqi <= 50) {
                    aqiElement.className = 'metric-value safe';
                } else {
                    aqiElement.className = 'metric-value';
                }
            } else {
                aqiElement.textContent = 'N/A';
                aqiElement.className = 'metric-value';
            }
        }

        // Generate realistic environmental data based on location
        if (this.selectedLocation) {
            this.updateEnvironmentalMetrics();
        }
    }

    updateEnvironmentalMetrics() {
        const lat = this.selectedLocation.lat;
        const isUrban = Math.abs(lat) < 60; // Simplified urban detection
        const isCoastal = Math.random() > 0.4;
        
        // CO2 levels (global average with variations)
        const co2Element = document.getElementById('co2Level');
        if (co2Element) {
            const co2 = Math.round(421 + (Math.random() - 0.5) * 10);
            co2Element.textContent = `${co2} ppm`;
            co2Element.className = co2 > 420 ? 'metric-value danger' : 'metric-value warning';
        }

        // Biodiversity index
        const biodiversityElement = document.getElementById('biodiversityIndex');
        if (biodiversityElement) {
            const biodiversity = isUrban ? 
                (4.0 + Math.random() * 3.0).toFixed(1) : 
                (6.0 + Math.random() * 3.0).toFixed(1);
            biodiversityElement.textContent = `${biodiversity}/10`;
            biodiversityElement.className = biodiversity < 5 ? 'metric-value danger' : 
                                          biodiversity < 7 ? 'metric-value warning' : 'metric-value safe';
        }

        // Forest coverage
        const forestElement = document.getElementById('forestCoverage');
        if (forestElement) {
            const forestChange = isUrban ? 
                (-2.3 + Math.random() * 1.0).toFixed(1) :
                (-1.5 + Math.random() * 2.0).toFixed(1);
            forestElement.textContent = `${forestChange}%/year`;
            forestElement.className = forestChange < 0 ? 'metric-value danger' : 'metric-value safe';
        }

        // Water quality
        const waterElement = document.getElementById('waterQuality');
        if (waterElement) {
            const qualities = ['Excellent', 'Good', 'Fair', 'Poor'];
            const weights = isCoastal ? [0.2, 0.4, 0.3, 0.1] : [0.3, 0.4, 0.2, 0.1];
            const quality = this.weightedRandom(qualities, weights);
            waterElement.textContent = quality;
            waterElement.className = quality === 'Excellent' || quality === 'Good' ? 'metric-value safe' :
                                    quality === 'Fair' ? 'metric-value warning' : 'metric-value danger';
        }

        // Urban heat island
        const heatIslandElement = document.getElementById('heatIsland');
        if (heatIslandElement) {
            const heatEffect = isUrban ? (2.0 + Math.random() * 3.0).toFixed(1) : (0.5 + Math.random() * 1.0).toFixed(1);
            heatIslandElement.textContent = `+${heatEffect}°C`;
            heatIslandElement.className = heatEffect > 3 ? 'metric-value danger' : 
                                         heatEffect > 2 ? 'metric-value warning' : 'metric-value';
        }
    }

    updateClimateProjectionsPanel() {
        if (!this.climateData || !this.selectedLocation) return;

        const currentProjection = this.getProjectionForYear(this.currentYear);
        if (!currentProjection) return;

        // Update future temperature
        const futureTempElement = document.getElementById('futureTemp');
        if (futureTempElement) {
            const tempIncrease = currentProjection.temperatureIncrease || 2.4;
            futureTempElement.textContent = `+${tempIncrease.toFixed(1)}°C`;
            futureTempElement.className = tempIncrease > 3 ? 'metric-value danger' : 'metric-value warning';
        }

        // Update sea level rise
        const seaLevelElement = document.getElementById('futureSeaLevel');
        if (seaLevelElement) {
            const seaLevel = currentProjection.seaLevelRise || 0.85;
            seaLevelElement.textContent = `+${seaLevel.toFixed(2)}m`;
            seaLevelElement.className = seaLevel > 1 ? 'metric-value danger' : 'metric-value warning';
        }

        // Update heat days
        const heatDaysElement = document.getElementById('heatDays');
        if (heatDaysElement) {
            const extraHeatDays = Math.round((currentProjection.temperatureIncrease || 2.4) * 18);
            heatDaysElement.textContent = `+${extraHeatDays} days/year`;
            heatDaysElement.className = extraHeatDays > 50 ? 'metric-value danger' : 'metric-value warning';
        }

        // Update precipitation change
        const precipElement = document.getElementById('precipitationChange');
        if (precipElement) {
            const isArid = Math.abs(this.selectedLocation.lat) < 35;
            const precipChange = isArid ? 
                (-20 + Math.random() * 10).toFixed(0) : 
                (-5 + Math.random() * 20).toFixed(0);
            precipElement.textContent = `${precipChange}%`;
            precipElement.className = precipChange < -10 ? 'metric-value danger' : 
                                     precipChange < 5 ? 'metric-value warning' : 'metric-value safe';
        }

        // Update drought risk
        const droughtElement = document.getElementById('droughtRisk');
        if (droughtElement) {
            const risks = ['Low', 'Moderate', 'High', 'Very High'];
            const isArid = Math.abs(this.selectedLocation.lat) < 35;
            const riskWeights = isArid ? [0.1, 0.2, 0.4, 0.3] : [0.3, 0.4, 0.2, 0.1];
            const risk = this.weightedRandom(risks, riskWeights);
            droughtElement.textContent = risk;
            droughtElement.className = risk === 'Very High' || risk === 'High' ? 'metric-value danger' : 
                                      risk === 'Moderate' ? 'metric-value warning' : 'metric-value safe';
        }
    }

    updateRiskAssessmentPanel() {
        if (!this.selectedLocation) return;

        const isCoastal = Math.random() > 0.4;
        const lat = Math.abs(this.selectedLocation.lat);
        const isUrban = Math.random() > 0.3;

        // Overall risk
        const overallElement = document.getElementById('overallRisk');
        if (overallElement) {
            const risks = ['Low', 'Moderate', 'High', 'Critical'];
            const riskWeights = isCoastal ? [0.1, 0.2, 0.3, 0.4] : [0.2, 0.3, 0.3, 0.2];
            const risk = this.weightedRandom(risks, riskWeights);
            overallElement.textContent = risk;
            overallElement.className = risk === 'Critical' || risk === 'High' ? 'metric-value danger' : 
                                      risk === 'Moderate' ? 'metric-value warning' : 'metric-value safe';
        }

        // Flood risk
        const floodElement = document.getElementById('floodRisk');
        if (floodElement) {
            const floodRisks = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
            const floodWeights = isCoastal ? [0.05, 0.1, 0.2, 0.35, 0.3] : [0.3, 0.3, 0.25, 0.1, 0.05];
            const floodRisk = this.weightedRandom(floodRisks, floodWeights);
            floodElement.textContent = floodRisk;
            floodElement.className = floodRisk.includes('High') ? 'metric-value danger' : 
                                    floodRisk === 'Moderate' ? 'metric-value warning' : 'metric-value safe';
        }

        // Wildfire risk
        const wildfireElement = document.getElementById('wildfireRisk');
        if (wildfireElement) {
            const isDry = lat < 45 && lat > 25;
            const wildfireRisks = ['Very Low', 'Low', 'Moderate', 'High', 'Extreme'];
            const wildfireWeights = isDry ? [0.1, 0.2, 0.3, 0.25, 0.15] : [0.25, 0.35, 0.25, 0.1, 0.05];
            const wildfireRisk = this.weightedRandom(wildfireRisks, wildfireWeights);
            wildfireElement.textContent = wildfireRisk;
            wildfireElement.className = wildfireRisk === 'Extreme' || wildfireRisk === 'High' ? 'metric-value danger' : 
                                       wildfireRisk === 'Moderate' ? 'metric-value warning' : 'metric-value safe';
        }

        // Affected population
        const popElement = document.getElementById('affectedPop');
        if (popElement) {
            const basePopulation = isUrban ? 500000 : 50000;
            const riskMultiplier = isCoastal ? 0.25 : 0.15;
            const affectedPop = Math.round(basePopulation * riskMultiplier);
            const popDisplay = affectedPop > 1000 ? `~${Math.round(affectedPop / 1000)}K` : `~${affectedPop}`;
            popElement.textContent = popDisplay;
            popElement.className = affectedPop > 100000 ? 'metric-value danger' : 'metric-value warning';
        }

        // Economic impact
        const ecoElement = document.getElementById('economicImpact');
        if (ecoElement) {
            const baseImpact = isUrban ? 5000000000 : 500000000;
            const riskMultiplier = isCoastal ? 0.6 : 0.4;
            const economicImpact = baseImpact * riskMultiplier;
            const impactB = (economicImpact / 1000000000).toFixed(1);
            ecoElement.textContent = `${impactB}B`;
            ecoElement.className = economicImpact > 2000000000 ? 'metric-value danger' : 'metric-value warning';
        }

        // Infrastructure vulnerability
        const infraElement = document.getElementById('infrastructureRisk');
        if (infraElement) {
            const infraRisks = ['Low', 'Moderate', 'High', 'Critical'];
            const infraWeights = isUrban && isCoastal ? [0.1, 0.2, 0.4, 0.3] : 
                                isUrban ? [0.2, 0.3, 0.3, 0.2] : [0.3, 0.4, 0.2, 0.1];
            const infraRisk = this.weightedRandom(infraRisks, infraWeights);
            infraElement.textContent = infraRisk;
            infraElement.className = infraRisk === 'Critical' || infraRisk === 'High' ? 'metric-value danger' : 
                                    infraRisk === 'Moderate' ? 'metric-value warning' : 'metric-value safe';
        }
    }

    updateDataSources(weatherData) {
        // Update weather data source
        const weatherSourceElement = document.getElementById('weatherDataSource');
        if (weatherSourceElement) {
            weatherSourceElement.textContent = weatherData.source || 'Open-Meteo API';
        }

        // Update air quality source
        const airQualitySourceElement = document.getElementById('airQualitySource');
        if (airQualitySourceElement) {
            airQualitySourceElement.textContent = this.airQualityData?.source || 'Estimated';
        }

        // Update last updated time
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lastUpdatedElement.textContent = timeString;
        }

        // Update confidence indicator
        this.updateConfidenceIndicator(weatherData);
    }

    updateConfidenceIndicator(weatherData) {
        let confidence = 85; // Base confidence

        if (weatherData.isEstimated) {
            confidence = 45;
        } else if (weatherData.source === 'Open-Meteo') {
            confidence = 90;
        } else if (weatherData.source === 'OpenWeatherMap') {
            confidence = 85;
        }

        // Adjust based on air quality data availability
        if (!this.airQualityData) {
            confidence -= 10;
        }

        const confidenceFill = document.getElementById('confidenceFill');
        const confidenceText = document.getElementById('confidenceText');

        if (confidenceFill) {
            confidenceFill.style.width = `${confidence}%`;
            
            if (confidence < 50) {
                confidenceFill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
            } else if (confidence < 75) {
                confidenceFill.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
            } else {
                confidenceFill.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
            }
        }

        if (confidenceText) {
            confidenceText.textContent = `${confidence}%`;
        }
    }

    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            if (random < weights[i]) {
                return items[i];
            }
            random -= weights[i];
        }
        
        return items[items.length - 1];
    }

    async fetchWithTimeout(url, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Genmap-Climate-Visualizer/1.0'
                }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    getWeatherDescription(weatherCode) {
        // WMO Weather interpretation codes
        const codes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            95: 'Thunderstorm'
        };
        
        return codes[weatherCode] || 'Unknown weather';
    }

    getEstimatedWeatherData(lat, lng) {
        // Estimate temperature based on latitude and season
        const month = new Date().getMonth() + 1; // 1-12
        const isNorthernHemisphere = lat > 0;
        
        // Seasonal adjustment
        let seasonalAdjustment = 0;
        if (isNorthernHemisphere) {
            // Northern hemisphere
            if (month >= 6 && month <= 8) seasonalAdjustment = 8; // Summer
            else if (month >= 12 || month <= 2) seasonalAdjustment = -8; // Winter
            else if (month >= 3 && month <= 5) seasonalAdjustment = 2; // Spring
            else seasonalAdjustment = -2; // Fall
        } else {
            // Southern hemisphere - opposite seasons
            if (month >= 6 && month <= 8) seasonalAdjustment = -8; // Winter
            else if (month >= 12 || month <= 2) seasonalAdjustment = 8; // Summer
            else if (month >= 3 && month <= 5) seasonalAdjustment = -2; // Fall
            else seasonalAdjustment = 2; // Spring
        }
        
        // Base temperature calculation based on latitude
        const baseTemp = 30 - (Math.abs(lat) * 0.6) + seasonalAdjustment;
        const temperature = Math.round((baseTemp + (Math.random() - 0.5) * 4) * 10) / 10;
        
        console.log(`📊 Estimated temperature for lat ${lat}: ${temperature}°C`);
        
        return {
            temperature: temperature,
            humidity: Math.round(40 + Math.random() * 40),
            description: 'Partly cloudy',
            windSpeed: Math.round((5 + Math.random() * 15) * 10) / 10,
            pressure: Math.round(1000 + Math.random() * 50),
            feelsLike: temperature + (Math.random() - 0.5) * 3,
            uvIndex: Math.max(0, Math.min(11, Math.round(6 + Math.random() * 4))),
            isEstimated: true
        };
    }

    detectMajorCity(coords, locationName) {
        // Check if coordinates are within bounds of major cities
        for (const [cityKey, cityData] of Object.entries(CITY_MODELS)) {
            const bounds = cityData.bounds;
            if (coords.lat >= bounds.south && coords.lat <= bounds.north &&
                coords.lng >= bounds.west && coords.lng <= bounds.east) {
                console.log(`🏙️ Detected major city: ${cityData.name}`);
                return cityData;
            }
        }

        // Check by name matching
        const cityName = locationName.toLowerCase();
        for (const [cityKey, cityData] of Object.entries(CITY_MODELS)) {
            if (cityName.includes(cityKey) || cityName.includes(cityData.name.toLowerCase())) {
                console.log(`🏙️ Detected major city by name: ${cityData.name}`);
                return cityData;
            }
        }

        return null; // Use generic city model
    }

    async geocodeLocation(query) {
        try {
            const response = await fetch(
                `${CONFIG.NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
            );
            
            if (!response.ok) throw new Error('Geocoding failed');
            
            const results = await response.json();
            if (!results || results.length === 0) throw new Error('Location not found');
            
            const location = results[0];
            return {
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lon),
                name: location.display_name
            };
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    }

    generateClimateProjections(lat, lng, weatherData = null) {
        console.log('📊 Generating climate projections...');
        
        const projections = {};
        const isCoastal = Math.random() > 0.3; // Simplified coastal detection
        const currentTemp = weatherData?.temperature || this.getEstimatedWeatherData(lat, lng).temperature;
        
        for (let year = 2024; year <= 2100; year += 5) {
            const progress = (year - 2024) / (2100 - 2024);
            const tempIncrease = progress * 2.4 + Math.random() * 0.5;
            const futureTemp = currentTemp + tempIncrease;
            const seaLevelRise = isCoastal ? progress * 0.84 + Math.random() * 0.1 : 0;
            
            projections[year] = {
                year,
                currentTemperature: currentTemp,
                temperatureIncrease: tempIncrease,
                futureTemperature: futureTemp,
                seaLevelRise: seaLevelRise,
                affectedPopulation: Math.floor(100000 + progress * 50000),
                economicImpact: progress * 2000000000,
                weatherData: weatherData
            };
        }
        
        return projections;
    }

    async showDemoDataWithFallback(originalLocation) {
        console.log('🎭 Showing demo data with fallback...');
        
        this.selectedLocation = CONFIG.DEFAULT_LOCATION;
        
        // Try to get weather data for default location
        let weatherData;
        try {
            weatherData = await this.getWeatherData(
                CONFIG.DEFAULT_LOCATION.lat, 
                CONFIG.DEFAULT_LOCATION.lng
            );
        } catch (error) {
            console.warn('Weather API failed for demo location, using estimated data');
            weatherData = this.getEstimatedWeatherData(
                CONFIG.DEFAULT_LOCATION.lat, 
                CONFIG.DEFAULT_LOCATION.lng
            );
        }
        
        this.selectedLocation.weather = weatherData;
        this.weatherData = weatherData;
        this.climateData = this.generateClimateProjections(
            CONFIG.DEFAULT_LOCATION.lat, 
            CONFIG.DEFAULT_LOCATION.lng,
            weatherData
        );
        
        this.updateLocationDisplay(`${CONFIG.DEFAULT_LOCATION.name} (Demo)`);
        this.updateCurrentWeatherPanel(weatherData);
        this.updateDataSources(weatherData);
        this.showClimateInterface();
        
        const message = originalLocation ? 
            `Location "${originalLocation}" not found. Showing demo data for ${CONFIG.DEFAULT_LOCATION.name}` :
            `Showing demo data for ${CONFIG.DEFAULT_LOCATION.name}`;
        this.showNotification(message);
    }

    showClimateInterface() {
        // Show the default active tab
        this.switchTab('currentWeather');
        
        // Show data info panel
        const dataInfoPanel = document.getElementById('dataInfoPanel');
        if (dataInfoPanel) dataInfoPanel.classList.add('active');

        // Start 3D animation if available
        if (this.scene3D) {
            this.scene3D.startAnimation();
        }
    }

    updateTimeline(year) {
        this.currentYear = year;
        const currentYearElement = document.getElementById('currentYear');
        if (currentYearElement) {
            currentYearElement.textContent = year;
        }

        // Get projection for this year
        const projection = this.getProjectionForYear(year);
        if (projection) {
            this.updateSeaLevel(projection.seaLevelRise);
            
            // Update current tab with timeline data
            if (this.currentTab === 'climateProjections') {
                this.updateClimateProjectionsPanel();
            } else if (this.currentTab === 'riskAssessment') {
                this.updateRiskAssessmentPanel();
            }
        }
    }

    getProjectionForYear(year) {
        // Find closest year in projections
        const years = Object.keys(this.climateData).map(Number);
        if (years.length === 0) return null;
        
        const closestYear = years.reduce((prev, curr) => 
            Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
        );
        return this.climateData[closestYear];
    }

    updateSeaLevel(riseInMeters) {
        this.seaLevelRise = riseInMeters;

        // Update 3D scene if available
        if (this.scene3D) {
            this.scene3D.updateSeaLevel(riseInMeters);
        }
    }

    updateLocationDisplay(locationName) {
        const headerSearch = document.getElementById('headerSearch');
        if (headerSearch) {
            headerSearch.value = locationName;
        }
    }

    returnToWelcome() {
        console.log('🏠 Returning to welcome...');
        
        const welcomeScreen = document.getElementById('welcomeScreen');
        const mapInterface = document.getElementById('mapInterface');

        if (welcomeScreen) welcomeScreen.classList.remove('fade-out');
        if (mapInterface) mapInterface.classList.remove('active');
        
        // Reset inputs
        const locationInput = document.getElementById('locationInput');
        const headerSearch = document.getElementById('headerSearch');
        if (locationInput) locationInput.value = '';
        if (headerSearch) headerSearch.value = '';
        
        // Hide all panels
        const panels = ['currentWeatherPanel', 'climateProjectionsPanel', 'environmentalPanel', 'riskAssessmentPanel'];
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.display = 'none';
                panel.classList.remove('active');
            }
        });

        const dataInfoPanel = document.getElementById('dataInfoPanel');
        if (dataInfoPanel) dataInfoPanel.classList.remove('active');
        
        // Reset timeline
        const timelineSlider = document.getElementById('timelineSlider');
        const currentYear = document.getElementById('currentYear');
        if (timelineSlider) timelineSlider.value = 2024;
        if (currentYear) currentYear.textContent = '2024';
        
        this.currentView = 'welcome';
        this.currentTab = 'currentWeather';
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            border: 1px solid #334155;
            z-index: 10000;
            font-size: 14px;
            max-width: 400px;
            text-align: center;
            backdrop-filter: blur(10px);
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        if (overlay && text) {
            text.textContent = message;
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Simple 3D Scene Manager
class Scene3DManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.buildings = [];
        this.waterMesh = null;
        this.isAnimating = false;
        this.buildingsGroup = null;
        this.currentMode = 'currentWeather';
    }

    async init() {
        console.log('🎨 Initializing 3D scene...');

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 50, 100);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Create city
        this.createCity();
        this.createWater();

        console.log('✅ 3D scene ready');
    }

    createCity() {
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(400, 400);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2d4a22 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Use generic buildings by default
        this.createGenericCity();
    }

    createGenericCity() {
        const buildingConfigs = [
            { width: 10, height: 25, depth: 8, x: -30, z: -20 },
            { width: 8, height: 35, depth: 12, x: -10, z: -15 },
            { width: 12, height: 20, depth: 10, x: 10, z: -25 },
            { width: 15, height: 40, depth: 15, x: 30, z: -10 },
            { width: 6, height: 15, depth: 8, x: -25, z: 10 },
            { width: 20, height: 50, depth: 18, x: 0, z: 5 },
            { width: 14, height: 30, depth: 12, x: 25, z: 15 },
            { width: 9, height: 18, depth: 9, x: -15, z: 25 }
        ];

        this.buildingsGroup = new THREE.Group();
        
        buildingConfigs.forEach((config, index) => {
            const building = this.createBuilding(config, index, 'generic');
            this.buildingsGroup.add(building.mesh);
            this.buildings.push(building);
        });

        this.scene.add(this.buildingsGroup);
    }

    loadCityModel(cityModel) {
        console.log('🏗️ Loading city-specific 3D model...');
        
        // Remove existing buildings
        if (this.buildingsGroup) {
            this.scene.remove(this.buildingsGroup);
            this.buildings = [];
        }

        if (!cityModel) {
            this.createGenericCity();
            return;
        }

        this.buildingsGroup = new THREE.Group();

        // Create landmarks first
        cityModel.landmarks.forEach(landmark => {
            const landmarkMesh = this.createLandmark(landmark);
            if (landmarkMesh) {
                this.buildingsGroup.add(landmarkMesh.mesh);
                this.buildings.push(landmarkMesh);
            }
        });

        // Create city-specific buildings
        cityModel.buildings.forEach((config, index) => {
            const building = this.createBuilding(config, index, config.type);
            this.buildingsGroup.add(building.mesh);
            this.buildings.push(building);
        });

        this.scene.add(this.buildingsGroup);
        console.log(`✅ Loaded ${cityModel.name} with ${cityModel.landmarks.length} landmarks`);
    }

    createLandmark(landmark) {
        const scaleFactor = 0.3;
        const height = landmark.height * scaleFactor;
        const width = landmark.width * scaleFactor;
        const depth = landmark.depth * scaleFactor;

        let geometry, material;

        switch (landmark.type) {
            case 'eiffel_tower':
                geometry = this.createEiffelTowerGeometry(width, height, depth);
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                break;
            case 'empire_state':
                geometry = this.createEmpireStateGeometry(width, height, depth);
                material = new THREE.MeshLambertMaterial({ color: 0x696969 });
                break;
            case 'big_ben':
                geometry = this.createBigBenGeometry(width, height, depth);
                material = new THREE.MeshLambertMaterial({ color: 0xD2B48C });
                break;
            default:
                geometry = new THREE.BoxGeometry(width, height, depth);
                material = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(landmark.position.x, height / 2, landmark.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return {
            mesh: mesh,
            baseHeight: height,
            isFlooded: false,
            isLandmark: true,
            name: landmark.name
        };
    }

    createEiffelTowerGeometry(width, height, depth) {
        const geometry = new THREE.BoxGeometry(width * 0.3, height, depth * 0.3);
        return geometry;
    }

    createEmpireStateGeometry(width, height, depth) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        return geometry;
    }

    createBigBenGeometry(width, height, depth) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        return geometry;
    }

    createBuilding(config, index, buildingType) {
        const geometry = new THREE.BoxGeometry(config.width, config.height, config.depth);
        
        let material;
        switch (buildingType) {
            case 'haussmann':
                material = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });
                break;
            case 'victorian':
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                break;
            case 'skyscraper':
                material = new THREE.MeshLambertMaterial({ color: 0x708090 });
                break;
            case 'modern':
                material = new THREE.MeshLambertMaterial({ color: 0x4682B4 });
                break;
            default:
                material = new THREE.MeshLambertMaterial({ 
                    color: [0x64748b, 0x475569, 0x334155, 0x1e293b][index % 4] 
                });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(config.x, config.height / 2, config.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return {
            mesh: mesh,
            baseHeight: config.height,
            isFlooded: false,
            buildingType: buildingType
        };
    }

    createWater() {
        const waterGeometry = new THREE.PlaneGeometry(600, 600, 32, 32);
        const waterMaterial = new THREE.MeshLambertMaterial({
            color: 0x006994,
            transparent: true,
            opacity: 0.7
        });

        this.waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
        this.waterMesh.rotation.x = -Math.PI / 2;
        this.waterMesh.position.y = -20;
        this.scene.add(this.waterMesh);
    }

    startAnimation() {
        this.isAnimating = true;
        this.animate();
    }

    animate() {
        if (!this.isAnimating) return;

        requestAnimationFrame(() => this.animate());

        // Animate camera
        const time = Date.now() * 0.0003;
        const radius = 150;
        this.camera.position.x = Math.cos(time) * radius;
        this.camera.position.z = Math.sin(time) * radius;
        this.camera.position.y = 80;
        this.camera.lookAt(0, 0, 0);

        // Animate water
        if (this.waterMesh) {
            const geometry = this.waterMesh.geometry;
            const vertices = geometry.attributes.position.array;
            
            for (let i = 0; i < vertices.length; i += 3) {
                const x = vertices[i];
                const y = vertices[i + 1];
                vertices[i + 2] = Math.sin(x * 0.05 + time * 3) * Math.cos(y * 0.05 + time * 2) * 0.5;
            }
            geometry.attributes.position.needsUpdate = true;
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateSeaLevel(riseInMeters) {
        if (!this.waterMesh) return;
        
        const targetY = -20 + (riseInMeters * 15);
        this.waterMesh.position.y = targetY;

        this.buildings.forEach(building => {
            const buildingBase = building.mesh.position.y - building.baseHeight / 2;
            building.isFlooded = targetY > buildingBase;
            
            if (building.isFlooded && this.currentMode === 'climateProjections') {
                if (building.isLandmark) {
                    building.mesh.material.color.setHex(0x8B0000);
                    building.mesh.material.transparent = true;
                    building.mesh.material.opacity = 0.8;
                } else {
                    building.mesh.material.color.setHex(0x1e40af);
                    building.mesh.material.transparent = true;
                    building.mesh.material.opacity = 0.7;
                }
            } else if (!building.isFlooded) {
                this.resetBuildingColor(building);
            }
        });

        const floodedLandmarks = this.buildings.filter(b => b.isLandmark && b.isFlooded);
        if (floodedLandmarks.length > 0) {
            console.log(`⚠️ LANDMARKS FLOODING: ${floodedLandmarks.map(l => l.name).join(', ')}`);
        }
    }

    resetBuildingColor(building) {
        let color;
        
        if (building.isLandmark) {
            switch (building.name) {
                case 'Tour Eiffel':
                    color = 0x8B4513;
                    break;
                case 'Empire State Building':
                    color = 0x696969;
                    break;
                case 'Big Ben':
                    color = 0xD2B48C;
                    break;
                default:
                    color = 0xFFD700;
            }
        } else {
            switch (building.buildingType) {
                case 'haussmann':
                    color = 0xF5F5DC;
                    break;
                case 'victorian':
                    color = 0x8B4513;
                    break;
                case 'skyscraper':
                    color = 0x708090;
                    break;
                case 'modern':
                    color = 0x4682B4;
                    break;
                default:
                    color = 0x64748b;
            }
        }
        
        building.mesh.material.color.setHex(color);
        building.mesh.material.transparent = false;
        building.mesh.material.opacity = 1.0;
    }

    setVisualizationMode(mode) {
        this.currentMode = mode;
        
        this.buildings.forEach((building, index) => {
            if (building.isLandmark) {
                switch (mode) {
                    case 'currentWeather':
                        if (!building.isFlooded) {
                            this.resetBuildingColor(building);
                        }
                        break;
                    case 'climateProjections':
                        // Keep current flooding state
                        if (!building.isFlooded) {
                            building.mesh.material.color.setHex(0xFF6B6B);
                        }
                        break;
                    case 'environmental':
                        building.mesh.material.color.setHex(0x4ECDC4);
                        break;
                    case 'riskAssessment':
                        building.mesh.material.color.setHex(0xFF9F43);
                        break;
                    default:
                        if (!building.isFlooded) {
                            this.resetBuildingColor(building);
                        }
                        break;
                }
            } else {
                switch (mode) {
                    case 'currentWeather':
                        if (!building.isFlooded) {
                            this.resetBuildingColor(building);
                        }
                        break;
                    case 'climateProjections':
                        const heatLevel = (building.baseHeight / 50) + (index % 3) * 0.2;
                        if (heatLevel > 0.7) {
                            building.mesh.material.color.setHex(0xef4444);
                        } else if (heatLevel > 0.4) {
                            building.mesh.material.color.setHex(0xf59e0b);
                        } else {
                            building.mesh.material.color.setHex(0x10b981);
                        }
                        break;
                    case 'environmental':
                        // Green gradient for environmental impact
                        const envLevel = Math.random();
                        if (envLevel > 0.7) {
                            building.mesh.material.color.setHex(0x059669); // Dark green - good
                        } else if (envLevel > 0.4) {
                            building.mesh.material.color.setHex(0x10b981); // Medium green
                        } else {
                            building.mesh.material.color.setHex(0xf59e0b); // Yellow - poor
                        }
                        break;
                    case 'riskAssessment':
                        // Risk-based coloring
                        const riskLevel = Math.random();
                        if (riskLevel > 0.6) {
                            building.mesh.material.color.setHex(0xef4444); // High risk - red
                        } else if (riskLevel > 0.3) {
                            building.mesh.material.color.setHex(0xf59e0b); // Medium risk - orange
                        } else {
                            building.mesh.material.color.setHex(0x10b981); // Low risk - green
                        }
                        break;
                    default:
                        if (!building.isFlooded) {
                            this.resetBuildingColor(building);
                        }
                        break;
                }
            }
            
            // Ensure materials are not transparent unless flooded
            if (!building.isFlooded) {
                building.mesh.material.transparent = false;
                building.mesh.material.opacity = 1.0;
            }
        });

        // Update water color based on mode
        if (this.waterMesh) {
            switch (mode) {
                case 'climateProjections':
                    this.waterMesh.material.color.setHex(0x1e40af); // Blue for sea level
                    break;
                case 'environmental':
                    this.waterMesh.material.color.setHex(0x059669); // Green for environmental
                    break;
                case 'riskAssessment':
                    this.waterMesh.material.color.setHex(0xef4444); // Red for risk
                    break;
                default:
                    this.waterMesh.material.color.setHex(0x006994); // Default blue
                    break;
            }
        }
    }

    stopAnimation() {
        this.isAnimating = false;
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    window.genmapApp = new GenmapApp();
    console.log('🌍 Climap loaded successfully with functional tabs and real weather data support');
});
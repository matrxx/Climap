/**
 * Genmap Climate Visualizer - Complete Application avec vraies données météo
 */

// Configuration
const CONFIG = {
    WEATHER_API_KEY: 'demo',
    NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',
    OPENWEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5/weather',
    WEATHER_API_BASE_URL: 'https://api.weatherapi.com/v1/current.json',
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
        this.currentYear = 2024;
        this.seaLevelRise = 0;
        this.selectedLocation = null;
        this.climateData = {};
        
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

        // Climate controls
        const seaLevelBtn = document.getElementById('seaLevelBtn');
        const temperatureBtn = document.getElementById('temperatureBtn');
        const precipitationBtn = document.getElementById('precipitationBtn');
        const extremeBtn = document.getElementById('extremeBtn');

        if (seaLevelBtn) seaLevelBtn.addEventListener('click', () => this.setClimateView('seaLevel'));
        if (temperatureBtn) temperatureBtn.addEventListener('click', () => this.setClimateView('temperature'));
        if (precipitationBtn) precipitationBtn.addEventListener('click', () => this.setClimateView('precipitation'));
        if (extremeBtn) extremeBtn.addEventListener('click', () => this.setClimateView('extreme'));

        // Timeline
        const timelineSlider = document.getElementById('timelineSlider');
        if (timelineSlider) {
            timelineSlider.addEventListener('input', (e) => {
                this.updateTimeline(parseInt(e.target.value));
            });
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

            // Generate climate data with real temperature
            this.climateData = this.generateClimateProjections(coords.lat, coords.lng, weatherData);

            // Update UI
            this.updateLocationDisplay(coords.name || location);
            this.updateClimateMetrics(weatherData);

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
                url: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=celsius`,
                parser: (data) => ({
                    temperature: data.current_weather?.temperature || null,
                    humidity: null,
                    description: this.getWeatherDescription(data.current_weather?.weathercode),
                    windSpeed: data.current_weather?.windspeed || null,
                    pressure: null
                })
            },
            {
                name: 'OpenWeatherMap (Free)',
                url: `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=demo&units=metric`,
                parser: (data) => ({
                    temperature: data.main?.temp || null,
                    humidity: data.main?.humidity || null,
                    description: data.weather?.[0]?.description || null,
                    windSpeed: data.wind?.speed || null,
                    pressure: data.main?.pressure || null
                })
            },
            {
                name: 'WeatherAPI (Free)',
                url: `https://api.weatherapi.com/v1/current.json?key=demo&q=${lat},${lng}&aqi=no`,
                parser: (data) => ({
                    temperature: data.current?.temp_c || null,
                    humidity: data.current?.humidity || null,
                    description: data.current?.condition?.text || null,
                    windSpeed: data.current?.wind_kph ? data.current.wind_kph / 3.6 : null,
                    pressure: data.current?.pressure_mb || null
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
        console.log('🎭 Showing demo data with fallback temperature...');
        
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
        this.climateData = this.generateClimateProjections(
            CONFIG.DEFAULT_LOCATION.lat, 
            CONFIG.DEFAULT_LOCATION.lng,
            weatherData
        );
        
        this.updateLocationDisplay(`${CONFIG.DEFAULT_LOCATION.name} (Demo)`);
        this.updateClimateMetrics(weatherData);
        this.showClimateInterface();
        
        const message = originalLocation ? 
            `Location "${originalLocation}" not found. Showing demo data for ${CONFIG.DEFAULT_LOCATION.name}` :
            `Showing demo data for ${CONFIG.DEFAULT_LOCATION.name}`;
        this.showNotification(message);
    }

    showClimateInterface() {
        const climatePanel = document.getElementById('climatePanel');
        const seaLevelInfo = document.getElementById('seaLevelInfo');

        if (climatePanel) climatePanel.classList.add('active');
        if (seaLevelInfo) seaLevelInfo.classList.add('active');

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
            this.updateTimelineMetrics(projection);
        }
    }

    getProjectionForYear(year) {
        // Find closest year in projections
        const years = Object.keys(this.climateData).map(Number);
        const closestYear = years.reduce((prev, curr) => 
            Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
        );
        return this.climateData[closestYear];
    }

    updateSeaLevel(riseInMeters) {
        this.seaLevelRise = riseInMeters;
        
        // Update water level display
        const waterLevelElement = document.getElementById('waterLevelValue');
        if (waterLevelElement) {
            waterLevelElement.textContent = `+${riseInMeters.toFixed(2)}`;
        }

        // Update 3D scene if available
        if (this.scene3D) {
            this.scene3D.updateSeaLevel(riseInMeters);
        }
    }

    updateTimelineMetrics(projection) {
        // Update temperature display
        const tempElement = document.getElementById('currentTemp');
        if (tempElement && projection.futureTemperature) {
            const temp = projection.futureTemperature.toFixed(1);
            tempElement.textContent = `${temp}°C`;
            
            // Color coding based on temperature
            if (projection.futureTemperature > 35) {
                tempElement.className = 'metric-value danger';
            } else if (projection.futureTemperature > 28) {
                tempElement.className = 'metric-value warning';
            } else {
                tempElement.className = 'metric-value safe';
            }
        }

        // Update sea level rise
        const seaLevelElement = document.getElementById('seaLevelRise');
        if (seaLevelElement) {
            seaLevelElement.textContent = `+${projection.seaLevelRise.toFixed(2)}m`;
        }

        // Update affected population
        const popElement = document.getElementById('affectedPop');
        if (popElement) {
            const popK = Math.round(projection.affectedPopulation / 1000);
            popElement.textContent = `~${popK}K`;
        }

        // Update economic impact
        const ecoElement = document.getElementById('economicImpact');
        if (ecoElement) {
            const impactB = (projection.economicImpact / 1000000000).toFixed(1);
            ecoElement.textContent = `$${impactB}B`;
        }

        // Update risk level
        this.updateRiskLevel(projection);
    }

    updateRiskLevel(projection) {
        const riskElement = document.getElementById('riskLevel');
        if (!riskElement) return;

        let riskLevel = 'Moderate';
        let riskClass = 'metric-value warning';
        
        if (projection.seaLevelRise > 2.0) {
            riskLevel = 'Catastrophic';
            riskClass = 'metric-value danger';
        } else if (projection.seaLevelRise > 1.0) {
            riskLevel = 'Critical';
            riskClass = 'metric-value danger';
        } else if (projection.seaLevelRise > 0.5) {
            riskLevel = 'High';
            riskClass = 'metric-value warning';
        }
        
        riskElement.textContent = riskLevel;
        riskElement.className = riskClass;
    }

    updateClimateMetrics(weatherData = null) {
        // Update current temperature with real data
        const tempElement = document.getElementById('currentTemp');
        if (tempElement) {
            if (weatherData && weatherData.temperature !== null) {
                const temp = weatherData.temperature.toFixed(1);
                tempElement.textContent = `${temp}°C`;
                
                // Add indicator if data is estimated
                if (weatherData.isEstimated) {
                    tempElement.textContent += ' (est.)';
                }
                
                // Color coding based on real temperature
                if (weatherData.temperature > 35) {
                    tempElement.className = 'metric-value danger';
                } else if (weatherData.temperature > 28) {
                    tempElement.className = 'metric-value warning';
                } else if (weatherData.temperature < 0) {
                    tempElement.className = 'metric-value safe';
                } else {
                    tempElement.className = 'metric-value';
                }
            } else {
                // Fallback to estimated temperature
                const estimatedWeather = this.getEstimatedWeatherData(
                    this.selectedLocation?.lat || 40.7128, 
                    this.selectedLocation?.lng || -74.0060
                );
                tempElement.textContent = `${estimatedWeather.temperature.toFixed(1)}°C (est.)`;
                tempElement.className = 'metric-value warning';
            }
        }

        // Display additional weather info if available
        this.displayAdditionalWeatherInfo(weatherData);
    }

    displayAdditionalWeatherInfo(weatherData) {
        if (!weatherData) {
            console.log('❌ No weather data to display');
            return;
        }

        console.log('📊 Displaying additional weather info:', weatherData);

        // Update weather conditions
        const conditionsElement = document.getElementById('weatherConditions');
        if (conditionsElement && weatherData.description) {
            conditionsElement.textContent = weatherData.description;
            conditionsElement.className = 'metric-value';
            
            if (weatherData.isEstimated) {
                conditionsElement.textContent += ' (estimated)';
            }
        }

        // Update humidity
        const humidityElement = document.getElementById('humidity');
        if (humidityElement && weatherData.humidity !== null) {
            humidityElement.textContent = `${weatherData.humidity}%`;
            humidityElement.className = 'metric-value';
            
            if (weatherData.isEstimated) {
                humidityElement.textContent += ' (est.)';
            }
        }

        // Log data source info
        if (weatherData.source) {
            console.log(`🌍 Weather data source: ${weatherData.source}`);
        }
        
        if (weatherData.windSpeed) {
            console.log(`🌪️ Wind Speed: ${weatherData.windSpeed} m/s`);
        }
        if (weatherData.pressure) {
            console.log(`📊 Pressure: ${weatherData.pressure} hPa`);
        }
        
        if (weatherData.isEstimated) {
            console.log('⚠️ WARNING: This is ESTIMATED data, not real weather data');
            this.showNotification('⚠️ Real weather APIs unavailable. Showing estimated data.');
        } else {
            console.log(`✅ SUCCESS: Real-time weather data from ${weatherData.source}`);
        }
    }

    setClimateView(viewType) {
        console.log(`🎛️ Switching to ${viewType} view`);
        
        // Update active button
        const buttons = document.querySelectorAll('.climate-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const activeButton = document.getElementById(`${viewType}Btn`);
        if (activeButton) activeButton.classList.add('active');

        // Update 3D visualization if available
        if (this.scene3D) {
            this.scene3D.setVisualizationMode(viewType);
        }

        // Show/hide panels based on view
        const seaLevelInfo = document.getElementById('seaLevelInfo');
        if (seaLevelInfo) {
            if (viewType === 'seaLevel') {
                seaLevelInfo.classList.add('active');
            } else {
                seaLevelInfo.classList.remove('active');
            }
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
        
        // Hide panels
        const climatePanel = document.getElementById('climatePanel');
        const seaLevelInfo = document.getElementById('seaLevelInfo');
        if (climatePanel) climatePanel.classList.remove('active');
        if (seaLevelInfo) seaLevelInfo.classList.remove('active');
        
        // Reset timeline
        const timelineSlider = document.getElementById('timelineSlider');
        const currentYear = document.getElementById('currentYear');
        if (timelineSlider) timelineSlider.value = 2024;
        if (currentYear) currentYear.textContent = '2024';
        
        this.currentView = 'welcome';
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
            
            if (building.isFlooded) {
                if (building.isLandmark) {
                    building.mesh.material.color.setHex(0x8B0000);
                    building.mesh.material.transparent = true;
                    building.mesh.material.opacity = 0.8;
                } else {
                    building.mesh.material.color.setHex(0x1e40af);
                    building.mesh.material.transparent = true;
                    building.mesh.material.opacity = 0.7;
                }
            } else {
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
        this.buildings.forEach((building, index) => {
            if (building.isLandmark) {
                switch (mode) {
                    case 'temperature':
                        building.mesh.material.color.setHex(0xFF6347);
                        break;
                    case 'precipitation':
                        building.mesh.material.color.setHex(0x4169E1);
                        break;
                    case 'extreme':
                        building.mesh.material.color.setHex(0x8A2BE2);
                        break;
                    default:
                        if (!building.isFlooded) {
                            this.resetBuildingColor(building);
                        }
                        break;
                }
            } else {
                switch (mode) {
                    case 'temperature':
                        const heatLevel = (building.baseHeight / 50) + (index % 3) * 0.2;
                        if (heatLevel > 0.7) {
                            building.mesh.material.color.setHex(0xef4444);
                        } else if (heatLevel > 0.4) {
                            building.mesh.material.color.setHex(0xf59e0b);
                        } else {
                            building.mesh.material.color.setHex(0x10b981);
                        }
                        break;
                    case 'precipitation':
                        building.mesh.material.color.setHex(0x3b82f6);
                        break;
                    case 'extreme':
                        building.mesh.material.color.setHex(0x7c3aed);
                        break;
                    default:
                        if (!building.isFlooded) {
                            this.resetBuildingColor(building);
                        }
                        break;
                }
            }
        });
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    window.genmapApp = new GenmapApp();
    console.log('🌍 Genmap loaded successfully with real weather data support');
});
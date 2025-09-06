# Climap - Climate Impact Visualizer

An interactive 3D web application for visualizing climate impact on coastal cities worldwide.

## Features

- **Real-time weather data**: temperature, humidity, wind, pressure
- **Climate projections**: sea level rise, temperature changes through 2100
- **Environmental indicators**: air quality, biodiversity, deforestation
- **Risk assessment**: flooding, wildfires, economic impact
- **3D visualization**: models of famous cities (Paris, New York, London)
- **Interactive timeline**: explore future climate scenarios

## Project Structure

```
Climap/
├── index.html          # Main page
├── css/
│   └── main.css        # Interface styles
└── js/
    └── app.js          # Main application
```

## Installation

1. Clone or download the project
2. Open `index.html` in your web browser
3. Search for a coastal city to begin

## APIs Used

- **Open-Meteo**: Free weather data
- **Open-Meteo Air Quality**: Air pollution data
- **OpenStreetMap Nominatim**: Address geocoding

## Usage

1. **Home page**: Enter the name of a coastal city
2. **Navigation**: Use the top tabs to explore different data sets
3. **Timeline**: Move the bottom slider to see future projections
4. **Visualization**: The 3D scene changes color based on active tab

## Available Tabs

- **Current Weather**: Real-time meteorological conditions
- **Climate Future**: Long-term climate projections and scenarios
- **Environmental**: Air quality, biodiversity, and ecological indicators
- **Risk Assessment**: Flood risk, wildfire risk, and economic impact

## Technical Details

- Built with vanilla JavaScript, Three.js for 3D graphics
- Responsive design for desktop and mobile
- Fallback systems for offline or API failure scenarios
- Real data integration with multiple weather APIs

## Browser Requirements

- Modern web browser with WebGL support
- Internet connection for real-time data
- JavaScript enabled

## License

Open source project for educational and research purposes.

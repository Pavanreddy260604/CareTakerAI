import { useState, useEffect } from 'react';

interface WeatherData {
    temperature: number;
    weatherCode: number;
    humidity: number;
    isHot: boolean;
    isCold: boolean;
    isRainy: boolean;
    description: string;
    icon: string;
    advice: string;
}

interface WeatherWidgetProps {
    onWeatherUpdate?: (weather: WeatherData) => void;
    compact?: boolean;
}

// Weather code to description mapping (WMO codes)
const weatherDescriptions: Record<number, { desc: string; icon: string }> = {
    0: { desc: 'Clear sky', icon: '☀️' },
    1: { desc: 'Mainly clear', icon: '🌤️' },
    2: { desc: 'Partly cloudy', icon: '⛅' },
    3: { desc: 'Overcast', icon: '☁️' },
    45: { desc: 'Foggy', icon: '🌫️' },
    48: { desc: 'Depositing rime fog', icon: '🌫️' },
    51: { desc: 'Light drizzle', icon: '🌧️' },
    53: { desc: 'Moderate drizzle', icon: '🌧️' },
    55: { desc: 'Dense drizzle', icon: '🌧️' },
    61: { desc: 'Slight rain', icon: '🌧️' },
    63: { desc: 'Moderate rain', icon: '🌧️' },
    65: { desc: 'Heavy rain', icon: '🌧️' },
    71: { desc: 'Slight snow', icon: '🌨️' },
    73: { desc: 'Moderate snow', icon: '🌨️' },
    75: { desc: 'Heavy snow', icon: '❄️' },
    77: { desc: 'Snow grains', icon: '❄️' },
    80: { desc: 'Slight showers', icon: '🌦️' },
    81: { desc: 'Moderate showers', icon: '🌦️' },
    82: { desc: 'Violent showers', icon: '⛈️' },
    85: { desc: 'Slight snow showers', icon: '🌨️' },
    86: { desc: 'Heavy snow showers', icon: '🌨️' },
    95: { desc: 'Thunderstorm', icon: '⛈️' },
    96: { desc: 'Thunderstorm with hail', icon: '⛈️' },
    99: { desc: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

export function WeatherWidget({ onWeatherUpdate, compact = false }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [locationDenied, setLocationDenied] = useState(false);

    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                // Using Open-Meteo API (free, no API key required)
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
                );

                if (!response.ok) throw new Error('Weather fetch failed');

                const data = await response.json();
                const current = data.current;

                const temp = Math.round(current.temperature_2m);
                const humidity = current.relative_humidity_2m;
                const code = current.weather_code;

                const weatherInfo = weatherDescriptions[code] || { desc: 'Unknown', icon: '🌡️' };
                const isHot = temp > 30;
                const isCold = temp < 10;
                const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);

                // Generate health-aware advice
                let advice = '';
                if (isHot) {
                    advice = 'High temperature: Increase water intake. Stay cool.';
                } else if (isCold) {
                    advice = 'Cold weather: Warm up properly before exercise.';
                } else if (isRainy) {
                    advice = 'Rainy conditions: Consider indoor exercise today.';
                } else if (humidity > 80) {
                    advice = 'High humidity: Stay hydrated and take breaks.';
                } else {
                    advice = 'Good conditions for outdoor activity.';
                }

                const weatherData: WeatherData = {
                    temperature: temp,
                    weatherCode: code,
                    humidity,
                    isHot,
                    isCold,
                    isRainy,
                    description: weatherInfo.desc,
                    icon: weatherInfo.icon,
                    advice
                };

                setWeather(weatherData);
                onWeatherUpdate?.(weatherData);
                setLoading(false);
            } catch (err) {
                console.error('Weather fetch error:', err);
                setError('Could not fetch weather');
                setLoading(false);
            }
        };

        // Fallback: Get location from IP (no permission needed)
        const getLocationFromIP = async () => {
            try {
                // Using ipapi.co (free tier, no key required)
                const response = await fetch('https://ipapi.co/json/');
                if (response.ok) {
                    const data = await response.json();
                    if (data.latitude && data.longitude) {
                        console.log('Weather: Using IP-based location:', data.city);
                        fetchWeather(data.latitude, data.longitude);
                        return true;
                    }
                }
            } catch (e) {
                console.error('IP location fallback failed:', e);
            }
            return false;
        };

        const getLocation = async () => {
            if (!navigator.geolocation) {
                // Try IP fallback
                const success = await getLocationFromIP();
                if (!success) {
                    setError('Location not available');
                    setLoading(false);
                }
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                async (err) => {
                    console.error('Geolocation error:', err);
                    if (err.code === err.PERMISSION_DENIED) {
                        setLocationDenied(true);
                    }
                    // Try IP-based fallback
                    console.log('Trying IP-based location fallback...');
                    const success = await getLocationFromIP();
                    if (!success) {
                        setError('Location access denied');
                        setLoading(false);
                    }
                },
                {
                    timeout: 15000,  // Increased timeout
                    maximumAge: 300000,  // Cache for 5 minutes
                    enableHighAccuracy: false
                }
            );
        };

        getLocation();
    }, [onWeatherUpdate]);

    if (loading) {
        if (compact) {
            return (
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono">
                    <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                    <span>Weather...</span>
                </div>
            );
        }
        return null;
    }

    if (error || !weather) {
        if (locationDenied && !compact) {
            return (
                <div className="text-[10px] text-muted-foreground/50 font-mono">
                    📍 Enable location for weather
                </div>
            );
        }
        return null;
    }

    if (compact) {
        return (
            <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-lg">{weather.icon}</span>
                <span className="text-foreground">{weather.temperature}°C</span>
                <span className="text-muted-foreground hidden sm:inline">{weather.description}</span>
            </div>
        );
    }

    return (
        <div className={`p-4 border rounded-xl transition-all ${weather.isHot ? 'border-orange-500/30 bg-orange-500/5' :
            weather.isCold ? 'border-blue-400/30 bg-blue-400/5' :
                weather.isRainy ? 'border-cyan-500/30 bg-cyan-500/5' :
                    'border-muted/30 bg-black/20'
            }`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{weather.icon}</span>
                    <div>
                        <p className="text-2xl font-mono font-bold">{weather.temperature}°C</p>
                        <p className="text-xs text-muted-foreground">{weather.description}</p>
                    </div>
                </div>
                <div className="text-right text-xs text-muted-foreground font-mono">
                    <p>Humidity: {weather.humidity}%</p>
                </div>
            </div>

            {/* Health-aware advice */}
            <div className={`text-xs font-mono p-2 rounded-lg ${weather.isHot ? 'bg-orange-500/10 text-orange-400' :
                weather.isCold ? 'bg-blue-400/10 text-blue-400' :
                    weather.isRainy ? 'bg-cyan-500/10 text-cyan-400' :
                        'bg-primary/10 text-primary'
                }`}>
                💡 {weather.advice}
            </div>
        </div>
    );
}

export default WeatherWidget;

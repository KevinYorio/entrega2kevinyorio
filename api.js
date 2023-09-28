
// Reemplaza 'TU_API_KEY' con tu propia API Key de OpenWeatherMap
const apiKey = '1caccf222268b4e9688b63047e7d889d';
const city = 'Haedo'; // Cambia 'Haedo' a la ciudad de tu elección

// URL de la API de OpenWeatherMap
const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

// Función para obtener y mostrar la información del clima
function mostrarClima() {
    fetch(apiUrl)
        .then((response) => response.json())
        .then((data) => {
            const temperatura = data.main.temp;
            const descripcion = data.weather[0].description;

            // Crea un elemento HTML para mostrar la información del clima
            const climaElement = document.createElement('p');
            climaElement.textContent = `Clima en ${city}: ${temperatura}°C, ${descripcion}`;

            // Agrega el elemento al footer
            const footer = document.querySelector('footer');
            footer.appendChild(climaElement);
        })
        .catch((error) => {
            console.error('Error al obtener datos del clima', error);
        });
}

// Llama a la función para mostrar el clima al cargar la página
mostrarClima();

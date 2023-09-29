
const apiKey = '1caccf222268b4e9688b63047e7d889d';
const city = 'Haedo'; 

const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

function mostrarClima() {
    fetch(apiUrl)
        .then((response) => response.json())
        .then((data) => {
            const temperatura = data.main.temp;
            const descripcion = data.weather[0].description;

            const climaElement = document.getElementById('clima-info'); 
            climaElement.textContent = `Clima en ${city}: ${temperatura}°C, ${descripcion}`;
        })
        .catch((error) => {
            console.error('Error al obtener datos del clima', error);
        });
}

mostrarClima();

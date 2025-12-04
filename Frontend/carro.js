const btnCart = document.querySelector('.container-cart-icon');
const containerCartProducts = document.querySelector(
	'.container-cart-products'
);

// Evento para abrir/cerrar el carrito desplegable
btnCart.addEventListener('click', () => {
	containerCartProducts.classList.toggle('hidden-cart');
});

/* ========================= */
const cartInfo = document.querySelector('.cart-product');
const rowProduct = document.querySelector('.row-product');

const productsList = document.querySelector('.container-items');

// Array que contendrá todos los productos agregados al carrito
let allProducts = [];

const valorTotal = document.querySelector('.total-pagar');

const countProducts = document.querySelector('#contador-productos');

const cartEmpty = document.querySelector('.cart-empty');
const cartTotal = document.querySelector('.cart-total');

// Retorna el total de unidades sumadas dentro del carrito
function obtenerCantidadProductosEnCarrito() {
    // Si existiera persistencia, aquí podrías recuperar el dato real.
    // De momento se calcula recorriendo la lista allProducts.
    return allProducts.reduce((total, product) => total + product.quantity, 0);
}

// Evento para agregar productos al carrito al hacer clic en "Agregar al carrito"
productsList.addEventListener('click', e => {
	if (e.target.classList.contains('btn-add-cart')) {
		const product = e.target.parentElement;

		// Extrae información del producto desde el DOM
		const infoProduct = {
			quantity: 1,
			title: product.querySelector('h2').textContent,
			price: product.querySelector('p').textContent,
		};

		// Verifica si ya existe un producto con ese título
		const exits = allProducts.some(
			product => product.title === infoProduct.title
		);

		// Si ya existe, se incrementa la cantidad
		if (exits) {
			const products = allProducts.map(product => {
				if (product.title === infoProduct.title) {
					product.quantity++;
					return product;
				} else {
					return product;
				}
			});
			allProducts = [...products];
		} else {
			// Si no existe, se agrega como nuevo
			allProducts = [...allProducts, infoProduct];
		}

		// Actualiza el HTML del carrito
		showHTML();
	}
});

// Evento para eliminar productos del carrito
rowProduct.addEventListener('click', e => {
	if (e.target.classList.contains('icon-close')) {
		const product = e.target.parentElement;
		const title = product.querySelector('p').textContent;

		// Filtra el producto por título y lo elimina
		allProducts = allProducts.filter(
			product => product.title !== title
		);

		console.log(allProducts);

		// Vuelve a renderizar el carrito
		showHTML();
	}
});

// Función que actualiza todo el HTML del carrito
const showHTML = () => {
	// Mostrar/ocultar mensajes según si está vacío o no
	if (!allProducts.length) {
		cartEmpty.classList.remove('hidden');
		rowProduct.classList.add('hidden');
		cartTotal.classList.add('hidden');
	} else {
		cartEmpty.classList.add('hidden');
		rowProduct.classList.remove('hidden');
		cartTotal.classList.remove('hidden');
	}

	// Limpia el contenedor antes de volver a renderizar productos
	rowProduct.innerHTML = '';

	let total = 0;
	let totalOfProducts = 0;

	// Recorre y renderiza cada producto del carrito
	allProducts.forEach(product => {
		const containerProduct = document.createElement('div');
		containerProduct.classList.add('cart-product');

		// Estructura HTML de cada fila del carrito
		containerProduct.innerHTML = `
            <div class="info-cart-product">
                <span class="cantidad-producto-carrito">${product.quantity}</span>
                <p class="titulo-producto-carrito">${product.title}</p>
                <span class="precio-producto-carrito">${product.price}</span>
            </div>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="icon-close"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        `;

		// Agrega el producto renderizado al carrito
		rowProduct.append(containerProduct);

		// Calcula el total multiplicando cantidad * precio (con slice para quitar el "$")
		total =
			total + parseInt(product.quantity * product.price.slice(1));
		totalOfProducts = totalOfProducts + product.quantity;
	});

	// Actualiza el total en pantalla
	valorTotal.innerText = `$${total}`;
	// Actualiza el contador del carrito (icono)
	countProducts.innerText = totalOfProducts;

	// Calcula cantidad total para controlar visibilidad del botón "Ir a pagar"
	const cantidadProductosEnCarrito = obtenerCantidadProductosEnCarrito();
	if (cantidadProductosEnCarrito > 0) {
		btnIrAPago.classList.remove("hidden");
	} else {
		btnIrAPago.classList.add("hidden");
	}

	// Controla visibilidad del botón "Comprar" según si hay productos
	if (allProducts.length > 0) {
		comprarBtn.classList.remove("hidden");
	} else {
		comprarBtn.classList.add("hidden");
	}
};

// Botón que lleva al usuario a la página de pago
const btnIrAPago = document.querySelector(".btn-ir-a-pago");
btnIrAPago.addEventListener("click", () => {
	window.location.href = "pago.html"; 
});

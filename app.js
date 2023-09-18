const express = require('express');
const crypto = require('node:crypto');
const { validateMovie, validatePartialMovie } = require('./movies.js');
const cors = require('cors'); // Cuidado, permite todas las opciones y desde todos los origenes, por defecto.
const movies = require('./movies.json');

const app = express();

app.disable('x-powered-by');
// a la hora de hacer despliegue el puerto suelen meterlo por variable de entorno
// es importante hacerlo asi:
const PORT = process.env.PORT ?? 1234;

// para que podamos leer el stream de datos de un json necesitamos el middleware
// que hicimos y vimos que express nos facilita en una instruccion:

app.use(express.json());

app.get('/', (req, res) => {
  res.json(movies);
});
// métodos normales: GET/HEAD/POST
// métodos complejos: PUT/PATCH/DELETE -> CORS PRE-FLIGHT

// SOLUCION CORS LISTA DE ORIGENES ADMITIDOS
const ACCEPTED_ORIGINS = [
  'http://127.0.0.1:5500'
];
// middleware con el modulo cors configurado

app.use(cors({
  origin: (origin, callback) => {
    // AQUI SE PODRIA DECLARAR ACCEPTED_ORIGINS O BUSCAR EN BBDD LOS ACCEPTED_ORIGINS
    if (ACCEPTED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    if (!origin) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: 'DELETE,PUT,PATH'
}));

// primer endpoint: "Path donde tenemos un recurso"
app.get('/movies', (req, res) => {
  // SOLUCION CROS.
  // (con el '*' como segundo parametro decimos que todos los origenes valen, no es lo mejor)
  // res.header('Access-Control-Allow-Origin', '*');
  // res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500/clase-3/web/index.html');
  // Recuperamos el origin
  const origin = req.header('origin');
  // si el origen es el mismo no se incluye la cabecera origin

  if (ACCEPTED_ORIGINS.includes(origin)) { // el navegador no envia origin cuando la peticion es del mismo origin
    res.header('Access-Control-Allow-Origin', origin); // NO ACABA EN / !!!!!
  } else if (!origin) { res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500'); }

  // recuperamos genre desde req.query, que guarda las querys y con el destructuring
  // más adelante esta lógica la separaremos y utilizaremos patrones de diseño
  const { genre } = req.query;
  if (genre) {
    // Esto funciona pero vamos a mejorarlo para que case unsensitive
    // const moviesByGenre = movies.filter(movie => movie.genre.includes(genre));

    const moviesByGenre = movies.filter(
      // MUY INTERESANTE filtramos las peliculas donde en el array genre los que cumplan esa condicion
      movie => movie.genre.some(g => g.toLowerCase() === genre.toLowerCase()));
    res.json(moviesByGenre);
  }
  res.json(movies);
});

// Como podemos usar el id que recibimos como si fuera un parametro
// se llama SEGMENTO DINÁMICO, PARÁMETROS de la URL
app.get('/movies/:id', (req, res) => { // Biblioteca: path-to-regexp -> convierte paths a regex
  // NADIE LO USA PERO: el primer parametro de app.get puede ser un REGEX:
  // app.get(/\/movies\/\d/, (req,res) =>{})
  // para recuperar los parametros:
  // si hay varios : app.get('/movies/:id/:name/:etc', (req, res) => {
  // const {id, name, etc} = req.params;
  const { id } = req.params;
  const movie = movies.find(movie => movie.id === id);
  if (movie) return res.json(movie);
  res.status(404).json({ message: 'Movie not found' });
});

// /movies por que siempre tiene que ser el mismo recurso, la misma url
// vamos a añadir a la coleccion movies
app.post('/movies', (req, res) => {
  // VALIDACIONES CON zod
  // 1. creamos un esquema para el objeto movie
  // (no es correcto hacerlo en cada request) -> lo pasamos al archivo movies.js

  // *solo van a pasar los datos que estemos validando
  const result = validateMovie(req.body);

  if (result.error) {
    // tambien se podria usar el 422
    return res.status(400).json({ error: JSON.parse(result.error.message) });
  }

  // creamos objeto newMovie
  const newMovie = {
    // node.js tiene una biblioteca nativa que permite crear ids unicas
    id: crypto.randomUUID(), // crea un uuid v4, identificador unico universal
    // *Por eso podemos ahora usar el operador ...
    ...result.data
  };
  // tendriamos que tener una funcion que genere ids unicas?

  // Esto no sería REST, porque estamos guardando el estado de la aplicacion en memoria

  movies.push(newMovie);

  res.status(201).json(newMovie);
});

// SOLUCION CORS PREFLIGH
app.options('/movies/:id', (req, res) => {
  const origin = req.header('origin');

  if (ACCEPTED_ORIGINS.includes(origin) || !origin) { // el navegador no envia origin cuando la peticion es del mismo origin
    res.header('Access-Control-Allow-Origin', origin); // NO ACABA EN / !!!!!
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  }
  res.sendStatus(200);
});

app.delete('/movies/:id', (req, res) => {
  const origin = req.header('origin');

  if (ACCEPTED_ORIGINS.includes(origin) || !origin) { // el navegador no envia origin cuando la peticion es del mismo origin
    res.header('Access-Control-Allow-Origin', origin); // NO ACABA EN / !!!!!
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  }

  const { id } = req.params;
  const movieIndex = movies.findIndex(movie => movie.id === id);
  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found' });
  }
  movies.splice(movieIndex, 1);
  return res.json({ message: 'Movie deleted' });
});

// Modificando movie parcialmente (se pueden modificar todos los atributos en este caso)
app.patch('/movies/:id', (req, res) => {
  // console.log(req.body); Para comprobar que el contenido de la request es correcto (no lo era)
  // console.log(req.body);

  const result = validatePartialMovie(req.body);
  if (!result.success) {
    return res.status(400).json({ error: JSON.parse(result.error.message) });
  }
  // const movie = movies.find(movie => movie.id === id);
  // En este caso vamos a encontrar el index, en bbdd de otra forma
  const { id } = req.params;
  const movieIndex = movies.findIndex(movie => movie.id === id);
  // si el indice es -1 significa que no lo ha encontrado
  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Movie not found' });
  }

  // vamos a pensar que todo se puede modificar todo
  // añadimos validatePartialmMovie(object) a movies.js
  console.log(movies[movieIndex]);
  console.log(result.data);
  const updateMovie = {
    ...movies[movieIndex],
    ...result.data
  };

  movies[movieIndex] = updateMovie;

  return res.json(updateMovie);
});

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});

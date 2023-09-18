const z = require('zod');

const movieSchema = z.object({
  title: z.string({
    invalid_type_error: 'Movie title must be a string',
    required_error: 'Movie title is required.'
  }),
  year: z.number().int().min(1900).max(2024),
  director: z.string(),
  duration: z.number().int().positive(),
  rate: z.number().min(0).max(10).default(0.0), // al indicarle que tiene valor por defecto, le estamos indicando que es opcional.
  // poster: z.string().url().endsWith('.jpg')
  poster: z.string().url({
    message: 'Poster must be a valid URL'
  }),
  genre: z.array(
    z.enum(['Drama', 'Action', 'Crime', 'Adventure', 'Sci-Fi', 'Romance', 'Animation', 'Biography', 'Fantasy']),
    {
      required_error: 'Movie genre is required',
      invalid_type_error: 'Movie genre must be an array of enum Genre'
    }
  )
});

function validateMovie (object) {
  return movieSchema.safeParse(object);
}

function validatePartialMovie (object) { // no sabemos si es movie aun
  // partial hace que todas las propiedades sean opcionales
  // si esta la valida si no no pasa nada
  return movieSchema.partial().safeParse(object);
}

module.exports = {
  validateMovie,
  validatePartialMovie
};

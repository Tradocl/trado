// Regiones y ciudades de Chile
export const regiones = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes"
];

export const ciudadesPorRegion: Record<string, string[]> = {
  "Arica y Parinacota": ["Arica", "Putre", "Camarones", "General Lagos"],
  "Tarapacá": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Pica", "Huara", "Colchane", "Camiña"],
  "Antofagasta": ["Antofagasta", "Calama", "Tocopilla", "Mejillones", "Taltal", "San Pedro de Atacama", "María Elena", "Sierra Gorda"],
  "Atacama": ["Copiapó", "Vallenar", "Chañaral", "Caldera", "Tierra Amarilla", "Huasco", "Freirina", "Diego de Almagro", "Alto del Carmen"],
  "Coquimbo": ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Vicuña", "Andacollo", "Los Vilos", "Salamanca", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado", "Canela", "La Higuera", "Paiguano"],
  "Valparaíso": ["Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana", "San Antonio", "Quillota", "Los Andes", "San Felipe", "La Calera", "Limache", "Concón", "La Ligua", "Casablanca", "Cartagena", "El Quisco", "Algarrobo", "El Tabo", "Santo Domingo", "Quintero", "Puchuncaví", "Zapallar", "Papudo", "Petorca", "Cabildo", "Catemu", "Panquehue", "Rinconada", "Santa María", "Hijuelas", "Nogales", "Olmué", "Calle Larga", "San Esteban", "Isla de Pascua", "Juan Fernández"],
  "Metropolitana de Santiago": ["Santiago", "Puente Alto", "Maipú", "La Florida", "Las Condes", "San Bernardo", "Peñalolén", "Pudahuel", "La Pintana", "El Bosque", "Quilicura", "Recoleta", "Ñuñoa", "Renca", "Lo Prado", "Macul", "San Miguel", "La Granja", "Cerro Navia", "Estación Central", "Lo Espejo", "Conchalí", "Pedro Aguirre Cerda", "Huechuraba", "San Ramón", "Independencia", "La Cisterna", "Quinta Normal", "Providencia", "San Joaquín", "La Reina", "Vitacura", "Lo Barnechea", "Cerrillos", "Colina", "Lampa", "Buin", "Paine", "Peñaflor", "Talagante", "Melipilla", "Curacaví", "María Pinto", "San Pedro", "Alhué", "El Monte", "Isla de Maipo", "Padre Hurtado", "Calera de Tango", "San José de Maipo", "Pirque", "Til Til"],
  "O'Higgins": ["Rancagua", "San Fernando", "Rengo", "Machalí", "Graneros", "San Vicente", "Peumo", "Pichilemu", "Santa Cruz", "Chimbarongo", "Requínoa", "Olivar", "Codegua", "Mostazal", "Coltauco", "Doñihue", "Coinco", "Quinta de Tilcoco", "Las Cabras", "Pichidegua", "Malloa", "San Francisco de Mostazal", "Placilla", "Nancagua", "Chépica", "Lolol", "Pumanque", "Palmilla", "Peralillo", "Navidad", "Litueche", "La Estrella", "Marchigüe"],
  "Maule": ["Talca", "Curicó", "Linares", "Constitución", "Cauquenes", "Molina", "San Javier", "Parral", "San Clemente", "Teno", "Maule", "Romeral", "Sagrada Familia", "Licantén", "Hualañé", "Vichuquén", "Rauco", "Pelarco", "Río Claro", "Pencahue", "Curepto", "Empedrado", "Colbún", "Villa Alegre", "Yerbas Buenas", "Longaví", "Retiro", "Pelluhue", "Chanco"],
  "Ñuble": ["Chillán", "Chillán Viejo", "San Carlos", "Bulnes", "Coihueco", "Quillón", "Yungay", "El Carmen", "Pemuco", "Pinto", "San Ignacio", "San Nicolás", "San Fabián", "Ñiquén", "Cobquecura", "Quirihue", "Ninhue", "Portezuelo", "Treguaco", "Coelemu", "Ránquil"],
  "Biobío": ["Concepción", "Talcahuano", "Los Ángeles", "Coronel", "Hualpén", "San Pedro de la Paz", "Chiguayante", "Tomé", "Penco", "Lota", "Arauco", "Lebu", "Curanilahue", "Nacimiento", "Mulchén", "Cabrero", "Cañete", "Los Álamos", "Yumbel", "Laja", "San Rosendo", "Tucapel", "Antuco", "Quilleco", "Santa Bárbara", "Quilaco", "Alto Biobío", "Tirúa", "Contulmo", "Hualqui", "Santa Juana", "Florida"],
  "La Araucanía": ["Temuco", "Padre Las Casas", "Angol", "Villarrica", "Pucón", "Victoria", "Lautaro", "Nueva Imperial", "Pitrufquén", "Carahue", "Traiguén", "Collipulli", "Cunco", "Freire", "Gorbea", "Loncoche", "Toltén", "Teodoro Schmidt", "Saavedra", "Galvarino", "Perquenco", "Cholchol", "Melipeuco", "Vilcún", "Curacautín", "Lonquimay", "Ercilla", "Los Sauces", "Lumaco", "Purén", "Renaico", "Curarrehue"],
  "Los Ríos": ["Valdivia", "La Unión", "Río Bueno", "Panguipulli", "Los Lagos", "Lanco", "Paillaco", "Mariquina", "Máfil", "Corral", "Futrono", "Lago Ranco"],
  "Los Lagos": ["Puerto Montt", "Osorno", "Castro", "Puerto Varas", "Ancud", "Calbuco", "Quellón", "Frutillar", "La Unión", "Puyehue", "Puerto Octay", "Purranque", "Río Negro", "San Juan de la Costa", "San Pablo", "Llanquihue", "Fresia", "Los Muermos", "Maullín", "Cochamó", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quinchao", "Chaitén", "Futaleufú", "Hualaihué", "Palena"],
  "Aysén": ["Coyhaique", "Puerto Aysén", "Chile Chico", "Cochrane", "Cisnes", "Guaitecas", "Lago Verde", "O'Higgins", "Río Ibáñez", "Tortel"],
  "Magallanes": ["Punta Arenas", "Puerto Natales", "Porvenir", "Puerto Williams", "Primavera", "Timaukel", "Cabo de Hornos", "Antártica", "Laguna Blanca", "Río Verde", "San Gregorio", "Torres del Paine"]
};

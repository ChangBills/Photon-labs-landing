# Atlas Eléctrico de México: de los recursos energéticos al consumidor

Tablero interactivo para TE1020 (A01744124). Cinco módulos: Recursos, Generación, Transmisión, Distribución y ¿Sabías que?

Sitio: https://changbills.github.io/Photon-labs-landing/

Fuentes: CFE, Informes Anuales 2022-2024; SENER, Plan de Desarrollo del Sector Eléctrico 2025-2030 (DOF 17/10/2025); IPCC AR5 GT III, Anexo III; DOF (2013, 2014, 2025); PRODESEN 2023-2037, cap. 4; NACEI (SENER/CRE); Natural Earth (contornos, dominio público). Cada cifra del sitio indica su fuente y página.

Para verlo en tu computadora: `python -m http.server` dentro de esta carpeta y abre http://localhost:8000

## Simulador de celdas solares

En la portada (`index.html#solar`): mediciones propias de un panel Epcom PRO-10012 en tres posiciones y un simulador de curva corriente-voltaje. Datos en `datos/solar.json`; lógica en `js/solar.js`; lecturas del multímetro en `assets/solar/`.

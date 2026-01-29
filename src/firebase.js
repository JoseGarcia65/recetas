import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ¡SUSTITUYE ESTO CON TUS DATOS DE FIREBASE!
const firebaseConfig = {
  apiKey: "AIzaSyBwF4r5mLiHOEC1THmn5Ehv2nKTJuRye9M",
  authDomain: "recetas-app-48c8b.firebaseapp.com",
  projectId: "recetas-app-48c8b",
  storageBucket: "recetas-app-48c8b.firebasestorage.app",
  messagingSenderId: "867449448078",
  appId: "1:867449448078:web:92a1e6d4a918f720420bdf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Nombre único para tu app (para separar datos si usas el mismo proyecto para varias cosas)
export const appId = "chef-inteligente-v1";
```

---

## 3. Instrucciones para Subir

1.  **Instalar Node.js:** Asegúrate de tener Node.js instalado en tu ordenador.
2.  **Iniciar Proyecto:** Abre una terminal en la carpeta y ejecuta:
    ```bash
    npm install
    ```
3.  **Probar:**
    ```bash
    npm run dev
    ```
4.  **Crear Repo en GitHub:** Crea un repositorio vacío en GitHub.
5.  **Subir código:**
    ```bash
    git init
    git add .
    git commit -m "Mi Chef Inteligente"
    git branch -M main
    git remote add origin [https://github.com/TU-USUARIO/nombre-de-tu-repo.git](https://github.com/TU-USUARIO/nombre-de-tu-repo.git)
    git push -u origin main
    ```
6.  **Desplegar:**
    ```bash
    npm run deploy
    ```
    *(Esto creará una rama `gh-pages` que GitHub usará automáticamente para mostrar tu web).*
7.  **Activar Pages:** En GitHub, ve a Settings -> Pages y asegúrate de que la fuente (Source) esté configurada para usar la rama `gh-pages`.

¡Y listo! Tu app estará en `https://TU-USUARIO.github.io/nombre-de-tu-repo/`.
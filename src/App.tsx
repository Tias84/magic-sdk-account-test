import React, { useState, useEffect } from "react";
import { Magic } from "magic-sdk";
import { BrowserProvider } from "ethers";
import "./App.css";

// * Verifica se è presente la chiave API di Magic
if (!process.env.REACT_APP_MAGIC_API_KEY) {
  throw new Error("REACT_APP_MAGIC_API_KEY is required.");
}

// Inizializza Magic SDK con la chiave API e le impostazioni
// * Impostazione opzionale: `useStorageCache` memorizza la sessione utente. Usa solo se è presente nel codice in Angular.
// ! Nota: Se `useStorageCache` è true, è consigliabile usare il metodo onUserLoggedOut per gestire le disconnessioni
const magic = new Magic(process.env.REACT_APP_MAGIC_API_KEY, {
  useStorageCache: true,
});

// * Inizializzazione del provider ethers con Magic per interagire con la blockchain
const provider = new BrowserProvider(magic.rpcProvider);

const App: React.FC = () => {
  // * Stato per memorizzare l'indirizzo dell'account connesso (null se non è connesso)
  const [account, setAccount] = useState<string | null>(null);

  // * Stato per controllare se la pagina sta caricando (true inizialmente)
  const [loading, setLoading] = useState(true);

  // * Funzione asincrona per connettere il wallet tramite Magic
  const connectWallet = async () => {
    try {
      // * Chiama l'interfaccia Magic per la connessione del wallet
      const accounts = await magic.wallet.connectWithUI();
      // * Aggiorna lo stato account con l'indirizzo ottenuto
      setAccount(accounts[0]);
    } catch (error) {
      // * Se c'è un errore nella connessione, viene loggato in console
      console.error("Connection failed", error);
    }
  };

  // Funzione asincrona per disconnettere l'utente
  const logout = async () => {
    try {
      // ! Usa il metodo onUserLoggedOut per verificare quando l'utente si disconnette (solo se useStorageCache è true)
      magic.user.onUserLoggedOut((isLoggedOut: boolean) => {
        if (isLoggedOut) {
          // * Aggiorna lo stato account a null quando l'utente è disconnesso
          setAccount(null);
        }
      });

      // ! Se non si usa onUserLoggedOut, bisogna gestire prima del logout il cambio di stato dell'account
      // setAccount(null);

      // * Esegue il logout dell'utente tramite Magic SDK
      await magic.user.logout();
    } catch (error) {
      // * Log dell'errore in caso di fallimento del logout
      console.error("Logout failed", error);
    }
  };

  // * useEffect per controllare lo stato di login all'avvio del componente
  useEffect(() => {
    // * Flag per verificare se il componente è montato
    let isMounted = true;

    // * Funzione asincrona per verificare lo stato di autenticazione dell'utente
    const checkLoginStatus = async () => {
      try {
        // * Controlla se l'utente è autenticato con Magic
        const isLoggedIn = await magic.user.isLoggedIn();

        if (isLoggedIn) {
          // * Se autenticato, ottiene le info dell'utente
          const user = await magic.user.getInfo();

          // * Ottiene il signer per confrontare l'indirizzo dell'utente con quello del signer
          // ! Il signer è necessario per interagire con la blockchain. Quindi è importante verificare che l'utente sia il proprietario dell'indirizzo
          const signer = await provider.getSigner();

          // * Confronta l'indirizzo pubblico del signer con l'indirizzo dell'utente
          if (user.publicAddress !== signer.address) {
            throw new Error("User address does not match signer address");
          }

          // * Se il componente è ancora montato, aggiorna l'account
          if (isMounted) {
            setAccount(user.publicAddress);
          }
        }
      } catch (error) {
        // * Log dell'errore in caso di problemi con la verifica del login
        console.error("Failed to check login status", error);
      } finally {
        // * Imposta loading a false una volta completata la verifica
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // * Chiama la funzione di controllo dello stato di login
    checkLoginStatus();

    // * Funzione di cleanup: imposta isMounted a false se il componente si smonta
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="main">
      <header className="header">
        <span>Magic test</span>
        {account && (
          <button onClick={logout} className="button">
            Disconetti
          </button>
        )}
      </header>
      <main className="main-content">
        {loading ? (
          <p>Caricamento...</p>
        ) : account ? (
          <p>Account Address: {account}</p>
        ) : (
          <button className="button" onClick={connectWallet}>
            Connetti Wallet
          </button>
        )}
      </main>
    </div>
  );
};

export default App;

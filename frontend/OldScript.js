const socket = io('http://localhost:3000', { transports: ['websocket'] });

function emitClickData(eventType, selector) {
  const elements = document.querySelectorAll(selector);

  elements.forEach(element => {
    element.addEventListener(eventType, async (event) => {
      const data = {
        tag: event.target.tagName.toLowerCase(),
        text: event.target.innerText,
        id: event.target.id,
        class: event.target.className,
        headers: Object.fromEntries([...new Headers(window.navigator).entries()]),
        localStorageData: getLocalStorageData(),
      };

      try {
        const ipAddress = await fetchIPAddress();
        data.ipAddress = ipAddress;
      } catch (error) {
        console.error('Error fetching IP address:', error);
        data.ipAddress = '';
      }

      socket.emit('clickData', data);
    });
  });
}

function getLocalStorageData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    data[key] = value;
  }
  return data;
}

async function fetchIPAddress() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP address:', error);
    return '';
  }
}

socket.on('clickDataSaved', (payload) => {
    console.log(payload.message); 
    console.log("Data Saved to mongodb")
  });
  socket.on('clickDataError', (payload) => {
    console.error(payload.message); 
  });


emitClickData('click', 'button');

// emitClickData('click', 'p');

emitClickData('click','a');

emitClickData('click', 'h1');




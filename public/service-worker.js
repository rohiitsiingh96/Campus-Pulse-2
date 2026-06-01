self.addEventListener("push", event => {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body || "Check out the latest update!",
        icon: data.icon || "https://cdn-icons-png.flaticon.com/512/2907/2907253.png",
        badge: "https://cdn-icons-png.flaticon.com/512/2907/2907253.png",
        data: { url: data.url || "/" },
        vibrate: [100, 50, 100],
        actions: [
          { action: 'open', title: 'View Details' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || "Campus Pulse Update", options)
      );
    } catch (err) {
      console.error("Error parsing push data:", err);
      // Fallback for non-JSON data
      event.waitUntil(
        self.registration.showNotification("Campus Pulse", {
          body: event.data.text()
        })
      );
    }
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

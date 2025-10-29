// filepath: d:\ultralytics-V11\HTML\js\loadHistory.js
document.addEventListener("DOMContentLoaded", function() {
    fetch('HTML\\data.json')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('history-container');
            data.forEach((item, index) => {
                const record = document.createElement('section');
                record.className = 'history-record';
                record.textContent = item.record;
                record.style.animationDelay = `${index * 0.2}s`;
                container.appendChild(record);
            });
        })
        .catch(error => console.error('Error loading JSON data:', error));
});
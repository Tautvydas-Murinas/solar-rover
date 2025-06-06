const socket = io('ws://localhost:8080');

socket.onmessage = ({ data }) => {
    console.log('Message from server ', data);
}

docket.querySelector('button').onclick = () => {
    socket.send('Hello Server!');
}
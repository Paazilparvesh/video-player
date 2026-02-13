import HlsPlayer from '/src/pages/videoPlayer.jsx';

function App() {
  return (
    <div className="App">
      <HlsPlayer src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" />
    </div>
  );
}

export default App;

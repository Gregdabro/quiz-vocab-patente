import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import QuizPage from './pages/QuizPage';
import StatsPage from './pages/StatsPage';
import DictionaryPage from './pages/DictionaryPage';
import ErrorsPage from './pages/ErrorsPage';
import BlockSelectPage from './pages/BlockSelectPage';
import VocabSessionPage from './pages/VocabSessionPage';
import BottomNav from './components/layout/BottomNav';

function AppContent() {
  const location = useLocation();
  var path = location.pathname;
  var isFullScreen = path.startsWith('/quiz/') || path.startsWith('/vocab/') || path.startsWith('/topic/');

  return (
    <div className="app-shell">
      <main className="page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz/:topicId/block/:blockId" element={<QuizPage />} />
          <Route path="/quiz/:topicId" element={<QuizPage />} />
          <Route path="/topic/:topicId" element={<BlockSelectPage />} />
          <Route path="/vocab/:topicId" element={<VocabSessionPage />} />
          <Route path="/errors" element={<ErrorsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/dictionary" element={<DictionaryPage />} />
        </Routes>
      </main>

      {!isFullScreen && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

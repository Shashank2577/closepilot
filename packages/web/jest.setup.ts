import '@testing-library/jest-dom';

// Mock matchMedia for jsdom
(global as any).window = (global as any).window || {};
(global as any).window.matchMedia = (global as any).window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

class MockEventSource {
  onmessage: any = null;
  close() {}
}

(global as any).EventSource = MockEventSource;

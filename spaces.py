import sys
import os

# Smart wrapper to load real ZeroGPU 'spaces' library on Hugging Face,
# or fall back to a mock decorator when running locally.

original_path = sys.path.copy()
try:
    # Remove local directory from path to search system libraries
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path = [p for p in sys.path if p != current_dir and p != ""]
    
    # Try importing the real system spaces module
    import spaces as real_spaces
    globals().update(real_spaces.__dict__)
    GPU = real_spaces.GPU
except ImportError:
    # Fallback mock decorator for local development
    def GPU(func):
        return func
finally:
    # Restore original path
    sys.path = original_path

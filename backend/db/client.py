from supabase import create_client, Client
import os

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Returns a singleton Supabase client using service role key."""
    global _supabase_client
    if _supabase_client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _supabase_client = create_client(url, key)
    return _supabase_client

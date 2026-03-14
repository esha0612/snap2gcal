import datetime
import os.path
import json

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/calendar"]


def get_authenticated_service(): #Authenticate and return Google Calendar API service.
  creds = None
  
  if os.path.exists("token.json"):
    creds = Credentials.from_authorized_user_file("token.json", SCOPES)
  
  # Refresh the token if valid but expired
  if creds and creds.expired and creds.refresh_token:
    try:
      creds.refresh(Request())
      print("Token refreshed successfully (silent refresh)")
    except Exception as e:
      print(f"Failed to refresh token: {e}. Requiring re-authentication...")
      creds = None
  
  # If no valid credentials, prompt user to log in
  if not creds or not creds.valid:
    flow = InstalledAppFlow.from_client_secrets_file(
        "client_secret_819478237464-d6v51818ev54jm1flti9idoai2u8gr8o.apps.googleusercontent.com.json", SCOPES
    )
    creds = flow.run_local_server(port=8080)
    print("Initial authentication complete")
  
  # Always save credentials for next run (ensures refresh token is stored)
  with open("token.json", "w") as token:
    token.write(creds.to_json())
  
  return build("calendar", "v3", credentials=creds)


def check_events_on_date(event_date):
  """
  Check if there are any events on the given date.
  
  Args:
      event_date (str): Date in format 'YYYY-MM-DD' or ISO datetime string
      
  Returns:
      list: List of events on that date
  """
  try:
    # Extract date from datetime string if needed
    if 'T' in event_date:
      date_str = event_date.split('T')[0]
    else:
      date_str = event_date
    
    # Create date range for the full day
    date_obj = datetime.datetime.fromisoformat(date_str)
    day_start = date_obj.replace(tzinfo=datetime.timezone.utc).isoformat()
    day_end = (date_obj + datetime.timedelta(days=1)).replace(tzinfo=datetime.timezone.utc).isoformat()
    
    service = get_authenticated_service()
    events_result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=day_start,
            timeMax=day_end,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )
    return events_result.get("items", [])
  except Exception as e:
    print(f"Warning: Could not check for existing events: {e}")
    return []


def create_event_from_schema(event_data):
  """
  Create a calendar event from JSON schema.
  Checks for conflicting events on the same day and asks for user confirmation.
  
  Args:
      event_data (dict or str): Event data as dictionary or path to JSON file
      
  Returns:
      dict: Created event object with event ID and details
  """
  # Load event data from file if string path is provided
  if isinstance(event_data, str):
    with open(event_data, 'r') as f:
      event_data = json.load(f)
  
  # Validate event data
  try:
    # Check required fields
    if not event_data.get('summary'):
      print("Error: Event must have a 'summary' field")
      return None
    
    if not event_data.get('start'):
      print("Error: Event must have a 'start' field")
      return None
    
    if not event_data.get('end'):
      print("Error: Event must have an 'end' field")
      return None
    
    # Get start and end times
    start_time = event_data['start'].get('dateTime') or event_data['start'].get('date')
    end_time = event_data['end'].get('dateTime') or event_data['end'].get('date')
    
    if not start_time or not end_time:
      print("Error: 'start' and 'end' must have 'dateTime' or 'date' fields")
      return None
    
    # Validate that end time is after start time
    if end_time <= start_time:
      print(f"Error: Event end time must be after start time")
      print(f"  Start: {start_time}")
      print(f"  End:   {end_time}")
      return None
    
    print(f"Creating event: {event_data['summary']}")
    print(f"  Start: {start_time}")
    print(f"  End:   {end_time}")
    
    # Check for existing events on the same day
    existing_events = check_events_on_date(start_time)
    if existing_events:
      print(f"\ WARNING: There are {len(existing_events)} other event(s) on this day:")
      for evt in existing_events:
        evt_start = evt["start"].get("dateTime", evt["start"].get("date"))
        print(f"   - {evt['summary']} ({evt_start})")
      
      # Ask for user confirmation
      response = input("\nAre you sure you want to add this event? (yes/no): ").strip().lower()
      if response not in ['yes', 'y']:
        print("Event creation cancelled.")
        return None
      print()
    
    service = get_authenticated_service()
    event = service.events().insert(calendarId='primary', body=event_data).execute()
    print(f" Event created successfully: {event.get('htmlLink')}")
    print(f" Event ID: {event.get('id')}")
    return event
    
  except FileNotFoundError:
    print(f"Error: File '{event_data}' not found")
    return None
  except json.JSONDecodeError:
    print(f"Error: Invalid JSON in file '{event_data}'")
    return None
  except HttpError as error:
    print(f"API Error: {error}")
    return None
  except Exception as error:
    print(f"Unexpected error: {error}")
    return None


def printNextEvents():
  """Shows basic usage of the Google Calendar API.
  Prints the start and name of the next 10 events on the user's calendar.
  """
  try:
    service = get_authenticated_service()

    # Call the Calendar API
    now = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
    print("Getting the upcoming 10 events")
    events_result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=now,
            maxResults=10,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )
    events = events_result.get("items", [])

    if not events:
      print("No upcoming events found.")
      return

    # Prints the start and name of the next 10 events
    for event in events:
      start = event["start"].get("dateTime", event["start"].get("date"))
      print(start, event["summary"])

  except HttpError as error:
    print(f"An error occurred: {error}")


if __name__ == "__main__":
  create_event_from_schema('sampleSchema.json')
  
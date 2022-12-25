import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pandas as pd 

DATA_FOLDER = Path('data')
DATA_FOLDER.mkdir(exist_ok=True)


def track(metrics: list['Metric']):
    print_tracker_title()

    log_data = build_log_data()  # Log data for tracking the day and time of data entry.
    manual_data = {metric.name: [metric.track()] for metric in metrics}
    data_dict = {**log_data, **manual_data}
    df = pd.DataFrame(data_dict)

    data_file = DATA_FOLDER / f'{Path(sys.argv[0]).stem}.csv'

    # Append to existing data if it already exists.
    if data_file.exists():
        df = pd.concat([pd.read_csv(data_file), pd.DataFrame(df)])

    df.to_csv(data_file, index=False)


@dataclass
class Metric:
    name: str
    type: type
    prompt: str
    pre_processor: callable = None
    default: any = None

    def prompt_user(self):
        return input(self.prompt.format(metric=self.name))

    def track(self):
        while True:
            try:
                response = self.prompt_user()
                if not response:
                    if self.default is not None:
                        data = self.default
                    else:
                        print("This metric requires a value.")
                        continue
                if self.pre_processor:
                    # Preprocess data with a function
                    data = self.pre_processor(response)
                else:
                    # Return data as the correct type
                    data = self.type(response)
                return data
            except ValueError:
                # If there's an error, continue to try to collect a proper value.
                print(f'Please enter a valid {self.type.__name__}.')


def print_tracker_title():
    current_file = Path(sys.argv[0])
    tracker_title = current_file.stem.replace('_', ' ').title() + ' Tracker' 
    print(tracker_title, end='\n\n')


def build_log_data():
    now = datetime.now()
    log_data = {'log date': [now.date()], 'log time': [now.time()]}
    return log_data



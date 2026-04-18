PERMITTED_USERS = ['ShanShanTukBoi', 'graciemq']


def assert_user_permitted(username):
    assert (username in PERMITTED_USERS,
            f"{username} not permitted")

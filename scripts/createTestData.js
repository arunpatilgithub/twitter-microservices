const axios = require('axios');

const userServiceUrl = 'http://localhost:3001/users';
const tweetServiceUrl = 'http://localhost:3002/tweets';

async function deleteAllUsers() {
  try {
    const response = await axios.get(userServiceUrl);
    const users = response.data;

    for (const user of users) {
      await axios.delete(`${userServiceUrl}/${user.id}`);
      console.log(`Deleted user: ${user.id}`);
    }
    console.log('All users deleted.');
  } catch (error) {
    console.error('Error deleting users:', error.response?.data || error.message);
  }
}

async function deleteAllTweets() {
  try {
    const response = await axios.get(tweetServiceUrl);
    const tweets = response.data;

    for (const tweet of tweets) {
      console.log(`Deleting tweet with _id: ${tweet._id}`);  // Log the correct _id
      await axios.delete(`${tweetServiceUrl}/${tweet._id}`);  // Use _id for deletion
      console.log(`Deleted tweet: ${tweet._id}`);
    }
    console.log('All tweets deleted.');
  } catch (error) {
    console.error('Error deleting tweets:', error.response?.data || error.message);
  }
}


async function createTestUsers() {
  const users = [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' },
    { name: 'Mike Johnson', email: 'mike@example.com' },
    { name: 'Alice Brown', email: 'alice@example.com' },
  ];

  const userIds = [];
  for (const user of users) {
    try {
      const response = await axios.post(userServiceUrl, user);
      console.log(`Created user: ${response.data.name}`);
      userIds.push(response.data.id);
    } catch (error) {
      console.error('Error creating user:', error.response?.data || error.message);
    }
  }
  return userIds;
}

async function createFollowRelationships(userIds) {
  console.log('Creating follow relationships...');
  const followPairs = [
    { userId: userIds[0], followId: userIds[1] },  // John follows Jane
    { userId: userIds[0], followId: userIds[2] },  // John follows Mike
    { userId: userIds[1], followId: userIds[2] },  // Jane follows Mike
    { userId: userIds[2], followId: userIds[0] },  // Mike follows John
    { userId: userIds[3], followId: userIds[1] },  // Alice follows Jane
  ];

  for (const { userId, followId } of followPairs) {
    try {
      await axios.post(`${userServiceUrl}/${userId}/follow/${followId}`);
      console.log(`User ${userId} followed user ${followId}`);
    } catch (error) {
      console.error(`Error creating follow relationship for user ${userId}:`, error.response?.data || error.message);
    }
  }
}

async function createTestTweets(userIds) {
  const tweets = [
    { content: 'Hello world, this is John!', authorId: userIds[0] },
    { content: 'Jane here, enjoying the day!', authorId: userIds[1] },
    { content: 'Mike checking in with a tweet.', authorId: userIds[2] },
    { content: 'Alice loves tweeting!', authorId: userIds[3] },
    { content: 'John again with another tweet!', authorId: userIds[0] },
    { content: 'Jane’s second tweet for the day.', authorId: userIds[1] },
  ];

  for (const tweet of tweets) {
    try {
      const response = await axios.post(tweetServiceUrl, tweet);
      console.log(`Created tweet: ${response.data.content} (authorId: ${response.data.authorId})`);
    } catch (error) {
      console.error('Error creating tweet:', error.response?.data || error.message);
    }
  }
}

async function main() {
  try {
    // Step 0: Delete all existing data
    await deleteAllUsers();
    await deleteAllTweets();

    // Step 1: Create Users
    const userIds = await createTestUsers();

    // Step 2: Create Follow Relationships
    await createFollowRelationships(userIds);

    // Step 3: Create Tweets
    await createTestTweets(userIds);

    console.log('Test data creation completed.');
  } catch (error) {
    console.error('Error in test data creation:', error.message);
  }
}

main();

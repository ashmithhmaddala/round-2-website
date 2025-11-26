

async function checkChallenges() {
  try {
    const response = await fetch('http://localhost:5000/api/challenges');
    const challenges = await response.json();
    console.log(JSON.stringify(challenges, null, 2));
  } catch (error) {
    console.error(error);
  }
}

checkChallenges();

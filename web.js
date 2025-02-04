const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4100;
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "Yotto";
const winningNumber = process.env.WINNING_NUMBER || "123456";
const secondPrizeNumbers = process.env.SECOND_PRIZE_NUMBERS ? process.env.SECOND_PRIZE_NUMBERS.split(",") : [];

if (!uri || !winningNumber || secondPrizeNumbers.length === 0) {
  console.error("필수 환경 변수가 누락되었습니다.");
  process.exit(1);
}

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;
client.connect().then(() => {
  console.log("✅ MongoDB 연결 성공");
  db = client.db(dbName);
}).catch((err) => {
  console.error("MongoDB 연결 실패:", err);
  process.exit(1);
});

app.use(cors());
app.use(bodyParser.json());

app.post("/api/participate", async (req, res) => {
  try {
    const { memberId, selectedStore, enteredNumber } = req.body;

    if (!memberId || typeof memberId !== "string" || !selectedStore || typeof selectedStore !== "string" || !/^\d{6}$/.test(enteredNumber)) {
      return res.status(400).json({ message: "올바른 입력값이 아닙니다." });
    }

    const collection = db.collection("yogibo");
    const existingEntry = await collection.findOne({ memberId, selectedStore, enteredNumber });
    if (existingEntry) {
      return res.status(400).json({ message: "이미 참여한 기록이 있습니다." });
    }

    // 당첨 여부 확인
    let resultMessage = "아쉽지만 당첨되지 않았습니다.";
    let isWinner = false;
    let prizeType = null;

    if (enteredNumber === winningNumber) {
      isWinner = true;
      prizeType = "당첨";
      resultMessage = "🎉 축하합니다! 1등 당첨되셨습니다!";
    } else if (secondPrizeNumbers.includes(enteredNumber)) {
      isWinner = true;
      prizeType = "미당첨";
      resultMessage = "아쉽게도 당첨되지 않았어요";
    }

    // 참여 데이터 MongoDB에 저장
    const participationData = {
      participationDate: new Date().toISOString(),     
      memberId,
      selectedStore,
      enteredNumber,
      isWinner,
      prizeType,
    };

    await collection.insertOne(participationData);

    res.status(200).json({
      message: resultMessage,
      isWinner,
      prizeType,
    });
  } catch (error) {
    console.error("참여 처리 중 오류:", error);
    res.status(500).json({ message: "서버 오류. 다시 시도해주세요." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

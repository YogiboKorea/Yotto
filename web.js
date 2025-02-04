const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const excelJS = require("exceljs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4100;
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "Yotto";
const COLLECTION_NAME = "yogibo";

const winningNumber = process.env.WINNING_NUMBER;
const secondPrizeNumber = process.env.SECOND_NUMBER;
const thirdPrizeNumber = process.env.THIRD_NUMBER;
const loserNumbers = process.env.LOSER_NUMBER
  ? new Set(process.env.LOSER_NUMBER.split(",").map((num) => num.trim()))
  : new Set();

if (!uri || !winningNumber || !secondPrizeNumber || !thirdPrizeNumber || loserNumbers.size === 0) {
  console.error("필수 환경 변수가 누락되었습니다.");
  process.exit(1);
}
console.log("환경변수에서 불러온 LOSER_NUMBER 목록:", Array.from(loserNumbers));

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;
client.connect()
  .then(() => {
    console.log("✅ MongoDB 연결 성공");
    db = client.db(dbName);
  })
  .catch((err) => {
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
        return res.status(400).json({ message: "이미 참여한 기록이 있는 번호입니다." });
      }
  
      const trimmedEnteredNumber = enteredNumber.trim(); // 공백 제거
  
      console.log("입력된 번호:", trimmedEnteredNumber);
      console.log("Set 내 모든 탈락 번호:", Array.from(loserNumbers)); // 디버그 로그
  
      if (loserNumbers.has(trimmedEnteredNumber)) {
        console.log(`탈락 번호 확인됨: ${trimmedEnteredNumber}`);
        return res.status(200).json({
          message: "아쉽지만 당첨되지 않았습니다.",
          isWinner: false,
          prizeType: "탈락",
        });
      }
  
      let isWinner = false;
      let prizeType = "미당첨";
      let resultMessage = "아쉽지만 당첨되지 않았습니다.";
  
      if (trimmedEnteredNumber === winningNumber) {
        isWinner = true;
        prizeType = "1등";
        resultMessage = "🎉 축하합니다! 1등 당첨되셨습니다!";
      } else if (trimmedEnteredNumber === secondPrizeNumber) {
        isWinner = true;
        prizeType = "2등";
        resultMessage = "🎉 축하합니다! 2등 당첨되셨습니다!";
      } else if (trimmedEnteredNumber === thirdPrizeNumber) {
        isWinner = true;
        prizeType = "3등";
        resultMessage = "🎉 축하합니다! 3등 당첨되셨습니다!";
      } else {
        return res.status(400).json({ message: "입력된 번호가 유효하지 않습니다." });
      }
  
      const participationDate = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  
      const participationData = {
        participationDate,
        memberId,
        selectedStore,
        enteredNumber: trimmedEnteredNumber,
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
  

// 엑셀 다운로드 API
app.get("/api/export", async (req, res) => {
  try {
    const collection = db.collection(COLLECTION_NAME);
    const data = await collection.find({}).toArray();

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("참여 데이터");

    worksheet.columns = [
      { header: "참여 날짜", key: "participationDate", width: 15 },
      { header: "회원 ID", key: "memberId", width: 20 },
      { header: "선택 매장", key: "selectedStore", width: 20 },
      { header: "입력 번호", key: "enteredNumber", width: 15 },
      { header: "당첨 여부", key: "isWinner", width: 10 },
      { header: "당첨 유형", key: "prizeType", width: 15 },
    ];

    data.forEach((record) => {
      worksheet.addRow({
        ...record,
        isWinner: record.isWinner ? "당첨" : "탈락", // true/false 변환
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="participation_data.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("엑셀 파일 생성 오류:", error);
    res.status(500).json({ message: "엑셀 파일 생성 중 오류가 발생했습니다." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

# 테이블 형식 데이터 구현 및 이벤트 참여 관리

## 데이터 테이블 구조
- **고객 아이디**
- **쿠폰 번호**
- **당첨 여부**

## 주요 기능

1. **난수 번호 데이터 저장**
   - 5000개의 난수 번호 데이터를 DB에 저장하여 당첨 여부 관리

2. **회원가입 여부 확인**
   - Cafe24 API 연동을 통해 회원가입 여부 확인 스크립트 추가

3. **매장 선택 및 당첨 번호 등록**
   - 이벤트 참여 시 매장 선택 수에 따른 당첨 번호 등록 기능 구현

4. **당첨 결과 팝업 노출**
   - 5000개의 난수 번호 중 미리 선별된 번호와 일치할 경우,
     - 1등, 2등, 3등에 대해 각각 다른 팝업을 노출하도록 설정

5. **로그인 필수 이벤트 참여**
   - 해당 페이지는 반드시 로그인 후 이벤트 참여가 가능하도록 설정

6. **입력 제어 및 중복 참여 방지**
   - 라디오 버튼 선택 완료 후 난수 번호 입력 창 노출
   - 입력된 난수 번호는 '-' 및 특수기호 사용 불가
   - 동일 번호로 중복 참여 시 경고창을 통해 중복 참여를 방지

## 이벤트 페이지 주소
- [이벤트 페이지](https://yogibo.kr/marketing/2025/yotto.html)

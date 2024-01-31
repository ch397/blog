require('dotenv').config();

const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const app = express();
const bcrypt = require('bcrypt');



app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));


const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});


app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  if (req.session.userId === undefined) {
    console.log('ログインしていません');
    res.locals.username = 'ゲスト';
    res.locals.isLoggedIn = false;
  } else {
    console.log('ログインしています');
    res.locals.username = req.session.username;
    res.locals.isLoggedIn = true;
  }
  next();

});

app.get('/', (req, res) => {
  res.render('top.ejs');
});

app.get('/list', (req, res) => {
  connection.query(
    'SELECT * FROM articles',
    (error, results) => {
      res.render('list.ejs', { articles: results });
    }
  );
});

app.get('/article/:id', (req, res) => {
  const id = req.params.id;
  connection.query(
    'SELECT * FROM articles WHERE id = ?',
    [id],
    (error, results) => {
      res.render('article.ejs', { article: results[0] });
    }
  );
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.get('/adminList', (req,res) => {
  connection.query(
    'SELECT * FROM articles',
    (error, results) => {
      if (res.locals.isLoggedIn === true) {
        // ここで adminPage.ejs に articles 変数を渡す
        res.render('adminList.ejs', { articles: results });
      } else {
        res.redirect('/login');
      }
    }
  );
});


app.post('/login', (req, res) => {
  const email = req.body.email;
  const plainPassword = req.body.password;

  // データベースからユーザーを検索
  connection.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
    if (error) {
      // エラーハンドリング
      console.error("データベースエラー:", error);
      return res.redirect('/login');
    }

    if (results.length > 0) {
      // ユーザーが見つかった場合
      const hashedPassword = results[0].password;
      
      // パスワード比較
      bcrypt.compare(plainPassword, hashedPassword, (err, isMatch) => {
        if (err) {
          // エラーハンドリング
          console.error("bcrypt エラー:", err);
          return res.redirect('/login');
        }

        if (isMatch) {
          // パスワードが一致した場合
          req.session.userId = results[0].id;
          req.session.username = results[0].username;
          res.redirect('/adminList');
        } else {
          // パスワードが一致しない場合
          res.redirect('/login');
        }
      });
    } else {
      // ユーザーが見つからない場合
      res.redirect('/login');
    }
  });
});





app.get('/logout', (req,res) => {
  req.session.destroy((error) => {
    res.redirect('/list');
  });
});

app.get('/edit/:id', (req, res) => {
  const id = req.params.id;
  if(res.locals.isLoggedIn === true) {
    connection.query(
      'SELECT * FROM articles WHERE id = ?', 
      [id],
      (error,results) => {
        res.render('adminEdit.ejs', { article: results[0] });
      }
    );
  } else {
    res.redirect('/login');
  }
});

app.post('/delete/:id', (req,res) => {
  const id = req.params.id;
  if (res.locals.isLoggedIn === true) {
    connection.query(
      'DELETE FROM articles WHERE id = ?', 
      [id],
      (error,results) => {
        res.redirect('/adminList');
      }
    );
  } else {
    res.redirect('/login');
  }
});

app.post('/update/:id', (req,res) => {
  const title = req.body.articleTitle
  const summary = req.body.articleSummary
  const content = req.body.articleContent
  const id = req.params.id;
  if (res.locals.isLoggedIn === true) {
    connection.query(
      'UPDATE articles SET title = ?, summary = ?, content = ? WHERE id = ?', 
      [title, summary, content, id],
      (error,results) => {
        res.redirect('/adminList');
      }
    );
  } else {
    res.redirect('/login');
  }
});

app.get('/new', (req,res) => {
  if (res.locals.isLoggedIn === true) {
    res.render('adminNew.ejs');
      } else {
    res.redirect('/login');
  }
});

app.post('/create', (req,res) => {
  const title = req.body.articleTitle
  const summary = req.body.articleSummary
  const content = req.body.articleContent
  if (res.locals.isLoggedIn === true) {
    connection.query(
      'INSERT INTO articles (title, summary, content) VALUES (?, ?, ?)', 
      [title, summary, content],
      (error,results) => {
        res.redirect('/adminList');
  });
        

}
});

app.get('/profile', (req, res) => {
  res.render('profile.ejs');
});

app.get('/inquiry', (req, res) => {
  res.render('inquiry.ejs');
});





app.listen(3000);

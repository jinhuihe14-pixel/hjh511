import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Button, Form, Field, CellGroup, NavBar, Tabbar, TabbarItem, Card, Tag, Search, List, PullRefresh, Empty, Dialog, Notify, Popup, Picker, NumberKeyboard, Calendar, RadioGroup, Radio, Checkbox, CheckboxGroup, Stepper, Cell, Icon } from 'vant'
import 'vant/lib/index.css'

import App from './App.vue'
import router from './router'
import './styles/index.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.use(Button)
app.use(Form)
app.use(Field)
app.use(CellGroup)
app.use(NavBar)
app.use(Tabbar)
app.use(TabbarItem)
app.use(Card)
app.use(Tag)
app.use(Search)
app.use(List)
app.use(PullRefresh)
app.use(Empty)
app.use(Dialog)
app.use(Notify)
app.use(Popup)
app.use(Picker)
app.use(NumberKeyboard)
app.use(Calendar)
app.use(RadioGroup)
app.use(Radio)
app.use(Checkbox)
app.use(CheckboxGroup)
app.use(Stepper)
app.use(Cell)
app.use(Icon)

app.mount('#app')
